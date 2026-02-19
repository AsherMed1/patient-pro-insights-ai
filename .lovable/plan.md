

# Fix EMR Badge + Add Admin Activity Log Tab

## Part 1: Fix Ricky Blanton EMR Badge Issue

### Root Cause
The `handle_appointment_status_completion` database trigger sets `internal_process_complete = true` when an appointment reaches a terminal status (Showed, Cancelled, No Show, OON, Do Not Call). However, when a status is later changed BACK to "Confirmed" (e.g., by the clinic or via webhook), `internal_process_complete` remains `true` because nothing resets it.

For Ricky Blanton, `internal_process_complete` is `true` while status is "Confirmed" and the EMR queue entry is still "pending" -- meaning it was never actually entered into EMR.

### Fix
Update the `handle_appointment_status_completion` trigger to reset `internal_process_complete = false` when status changes to "Confirmed" or any non-terminal status. This ensures the badge correctly shows "Pending EMR" until the EMR team actually marks it complete.

**SQL migration:**
```sql
-- Add a reset clause: when status goes back to Confirmed/Pending, 
-- reset internal_process_complete to false
IF LOWER(TRIM(NEW.status)) IN ('confirmed', 'pending') THEN
  NEW.internal_process_complete := false;
END IF;
```

Also fix Ricky Blanton's record directly:
```sql
UPDATE all_appointments 
SET internal_process_complete = false 
WHERE id = '9d53bfc3-a18f-4381-b2af-ee78c9b5d944';
```

---

## Part 2: Admin-Only Activity Log Tab

Add a new collapsible section in the `DetailedAppointmentView` that is only visible to admin users. This section aggregates all tracked activity for that appointment from multiple sources:

### Data Sources
1. **audit_logs** -- Portal updates with user attribution (status changes, field edits)
2. **security_audit_log** -- System-level events (auto-completion triggers, tag-based status changes)
3. **appointment_notes** -- Internal notes (already visible, but included in timeline for completeness)

### UI Design
- A new "Activity Log" card section added after Internal Notes in `DetailedAppointmentView`
- Only renders when the current user has the `admin` role (via `useRole` hook)
- Shows a chronological timeline of all events with:
  - Timestamp
  - Who made the change (user name or "System")
  - What changed (action description)
  - Source badge (Portal / Automation / API / System Trigger)
- Collapsible, defaults to collapsed to keep the view clean

### Files Changed

1. **New file: `src/components/appointments/AdminActivityLog.tsx`**
   - New component that queries `audit_logs` and `security_audit_log` for the given appointment ID
   - Merges and sorts results chronologically
   - Renders a timeline with color-coded source badges
   - Uses `useRole` to gate visibility to admin only

2. **Modified: `src/components/appointments/DetailedAppointmentView.tsx`**
   - Import and render `AdminActivityLog` after the Internal Notes section
   - Pass `appointmentId` and `appointmentName` props

3. **New migration** to update the `handle_appointment_status_completion` trigger to reset `internal_process_complete` when status returns to Confirmed/Pending

### Activity Log Entry Format
Each entry in the timeline will show:

```
[timestamp] [Source Badge] [Description]
by [User Name]
```

Example entries:
- "Portal update by Marissa Kresnik: Updated status from 'Pending' to 'Confirmed'" (Source: Portal)
- "Appointment queued for EMR entry: Ricky Blanton" (Source: Automation)
- "Appointment auto-completed: status set to Showed" (Source: System Trigger)
- "Insurance card fetch queued for: Ricky Blanton" (Source: Database Trigger)

### Clinic Visibility
The Activity Log tab will NOT be visible to `project_user` or `agent` roles -- only `admin` users can see it. This gives your team full visibility into whether changes were made by the clinic, the system, or via API/webhook, without exposing this diagnostic data to clients.
