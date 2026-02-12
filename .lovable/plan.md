
# Show User Name Instead of "System" on Status Change Notes

## Problem

When a status is changed from the portal list view, the internal note says `created_by: 'System'` with no user attribution. The user wants the note to show the actual person who made the change (e.g., "Jenny S" or "Lisa") instead of "System", similar to how the `update-appointment-fields` edge function already attributes notes to the user.

## Change

### File: `src/components/AllAppointmentsManager.tsx`

1. Import `useUserAttribution` hook (already exists in the codebase)
2. Call `useUserAttribution()` at the top of the component to get `userName`
3. Update the status change note (line 658) to include the user name:
   - From: `Status changed from "X" to "Y" - [[timestamp:...]]`
   - To: `Status changed from "X" to "Y" by {userName} - [[timestamp:...]]`
4. Change `created_by` (line 665) from `'System'` to the actual `userName`
5. Also update the "DO NOT CALL" note (line 675) `created_by` from `'System'` to `userName`

### File: `src/components/appointments/AppointmentNotes.tsx`

No changes needed -- the display logic already handles non-"System" names correctly (shows yellow styling for user notes vs blue for system notes). Notes attributed to real users will display with the user's name.

### Result

Status change notes will show:
- `Status changed from "Confirmed" to "Welcome Call" by Jenny S - Feb 11, 2026, 2:06 AM` with `created_by: "Jenny S"`

instead of:
- `Status changed from "Confirmed" to "Welcome Call" - Feb 11, 2026, 2:06 AM` with `created_by: "System"`
