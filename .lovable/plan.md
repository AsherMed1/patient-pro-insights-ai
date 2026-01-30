

# Plan: Fix Rescheduled Patients IPC Reset Flow

## Problem Summary

When a patient appointment is rescheduled, three issues prevent proper re-processing:

| Issue | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| **IPC Not Reset** | `internal_process_complete` stays `true` | Should reset to `false` |
| **Status Not Reset** | Status stays as "Rescheduled" | Should reset to "Confirmed" |
| **Tab Placement** | Appointment stuck (hidden from New tab) | Should appear in "New" tab |

### Root Cause

In `src/components/appointments/AppointmentCard.tsx` (lines 637-641), the `handleRescheduleSubmit` function updates:
```typescript
{
  date_of_appointment: newDate,
  requested_time: newTime,
  status: 'Rescheduled',  // ← Never resets to Confirmed
  // ← Missing: internal_process_complete: false
}
```

---

## Solution

### Approach 1: Fix UI Reschedule Logic (Primary)

Update the `handleRescheduleSubmit` function to:
1. Reset `internal_process_complete` to `false`
2. Set status to `Confirmed` instead of `Rescheduled`

This ensures the appointment flows back into the "New" pipeline for re-processing.

### Approach 2: Add Database Trigger (Optional Enhancement)

Create a database trigger that automatically resets IPC when `date_of_appointment` changes. This provides a safety net for reschedules from any source (UI, GHL webhook, API).

---

## Implementation Details

### File 1: `src/components/appointments/AppointmentCard.tsx`

**Location**: Lines 634-642 (`handleRescheduleSubmit` function)

**Change**: Update the Supabase update call to include IPC reset and Confirmed status:

```typescript
// Update local appointment
const { error: updateError } = await supabase
  .from('all_appointments')
  .update({
    date_of_appointment: newDate,
    requested_time: newTime,
    status: 'Confirmed',                    // ← Changed from 'Rescheduled'
    internal_process_complete: false,        // ← Added: Reset IPC
    last_ghl_sync_status: 'pending',
    updated_at: new Date().toISOString()
  })
  .eq('id', appointment.id);
```

### File 2: `supabase/functions/ghl-webhook-handler/index.ts`

**Location**: `getUpdateableFields` function (lines 586-644)

**Change**: Add logic to reset IPC when appointment date changes:

```typescript
// For UPDATE - selective fields only
const updateFields: Record<string, any> = {}

// Always accept date/time changes (rescheduling)
if (webhookData.date_of_appointment !== undefined) {
  updateFields.date_of_appointment = webhookData.date_of_appointment
  
  // Reset IPC if date actually changed (reschedule detected)
  if (existingAppointment.date_of_appointment !== webhookData.date_of_appointment) {
    updateFields.internal_process_complete = false
    updateFields.status = 'Confirmed'  // Reset from Rescheduled/other
  }
}
```

---

## Database Trigger Enhancement (Optional)

Add a new trigger to auto-reset IPC on date change:

```sql
CREATE OR REPLACE FUNCTION public.handle_appointment_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Detect reschedule: date_of_appointment changed
  IF TG_OP = 'UPDATE' AND 
     OLD.date_of_appointment IS DISTINCT FROM NEW.date_of_appointment THEN
    
    -- Reset internal process for re-processing
    NEW.internal_process_complete := false;
    
    -- Reset status to Confirmed (unless terminal)
    IF LOWER(TRIM(COALESCE(NEW.status, ''))) NOT IN 
       ('cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon') THEN
      NEW.status := 'Confirmed';
    END IF;
    
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_appointment_reschedule
  BEFORE UPDATE ON public.all_appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_reschedule();
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` | Add `internal_process_complete: false` and change status to `Confirmed` in reschedule update |
| `supabase/functions/ghl-webhook-handler/index.ts` | Reset IPC and status when date changes during webhook updates |
| New migration (optional) | Database trigger to auto-reset on any date change |

---

## Expected Outcome

After implementation:

| Scenario | Result |
|----------|--------|
| User reschedules via UI | Appointment status → "Confirmed", IPC → `false`, appears in "New" tab |
| GHL sends reschedule webhook | Appointment status → "Confirmed", IPC → `false`, appears in "New" tab |
| Appointment with terminal status | Not affected (stays as Cancelled/Showed/No Show) |

### Tab Flow After Reschedule:
```text
Rescheduled → Confirmed (status reset) + IPC=false → Appears in "New" tab
                                                    → Staff processes as new appointment
                                                    → Marks Welcome Call + IPC=true
                                                    → Moves to "Upcoming" tab
```

---

## Acceptance Criteria Validation

| Criteria | Solution |
|----------|----------|
| Reschedule action triggers IPC reset | ✅ `internal_process_complete: false` added to update |
| Rescheduled appointment doesn't stay "Rescheduled" | ✅ Status changes to "Confirmed" |
| Rescheduled appointment appears in New tab | ✅ IPC=false makes it visible in New tab filter |

