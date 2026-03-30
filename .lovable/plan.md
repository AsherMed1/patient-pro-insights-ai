

## Add Cancellation Reason Dialog

### What
When a user selects "Cancelled" from the status dropdown, intercept it (like we do for "Rescheduled") and show a dialog requiring a cancellation reason before proceeding. The reason is saved as an internal note and stored on the appointment for reporting.

### Cancellation Reasons
- Not Interested Anymore
- Seeking Treatment Elsewhere
- Lives Too Far / Travel Not Feasible
- Does Not Want to Be Contacted
- Unhappy with Service / Experience
- Other (requires notes)

### Changes

**1. Database: Add `cancellation_reason` column**
- Add `cancellation_reason TEXT` to `all_appointments` table
- No migration for JSONB — simple text column to store the selected reason

**2. `src/components/appointments/AppointmentCard.tsx`**
- Add state: `showCancelDialog`, `cancelReason`, `cancelNotes`
- Intercept "Cancelled" in `handleStatusChange` (same pattern as "Rescheduled") to show the cancel reason dialog
- Dialog contains: radio buttons for the 6 reasons, a notes textarea (required when "Other" is selected, optional otherwise), and Submit/Cancel buttons
- On submit: call `onUpdateStatus` with "Cancelled", then save the reason via edge function and create an internal note like `"Cancellation Reason: [reason]. Notes: [notes]"`

**3. `src/components/appointments/DetailedAppointmentView.tsx`**
- Same intercept pattern for the status dropdown in the detailed view
- Reuse the same cancel dialog UI

**4. `src/components/AllAppointmentsManager.tsx`**
- Update `updateAppointmentStatus` to accept an optional `cancellationReason` and `cancellationNotes` parameter
- When present, include `cancellation_reason` in the DB update and create a dedicated internal note
- If reason is "Does Not Want to Be Contacted", also trigger DND in GHL (same as "Do Not Call" flow)

**5. Update types**
- Add `cancellation_reason` to `AllAppointment` interface
- Add `onUpdateStatus` signature to optionally accept reason/notes

### Technical Flow
```text
User selects "Cancelled" → Dialog appears with reason options
  → User picks reason (+ optional notes) → Submit
  → DB update: status=Cancelled, cancellation_reason=[reason]
  → Internal note: "Cancellation Reason: [reason]. Notes: [notes]"
  → GHL sync: cancel appointment
  → If "Does Not Want to Be Contacted": also enable DND
```

### Files to Edit
- New migration: add `cancellation_reason` column
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/DetailedAppointmentView.tsx`
- `src/components/AllAppointmentsManager.tsx`
- `src/components/appointments/types.ts`

