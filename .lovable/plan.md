# Fix OON from View Details

## What is happening

The View Details modal uses its own status update path (`handleFieldUpdate`) instead of the shared `changeAppointmentStatus` utility that was just updated for OON.

That means when OON is selected inside View Details, it currently:
- Saves the portal status through `update-appointment-fields`
- Then calls `update-ghl-appointment` directly
- Because `update-ghl-appointment` maps `OON` to `cancelled`, GHL can be cancelled before the OON workflow gets the required confirmed-appointment state
- It bypasses the newer OON side effects from `changeAppointmentStatus`: Slack OON alert, `appointment-oon` tag, webhook trigger, conditional `oon pt` fallback, and internal audit note

The card-level status dropdown works because it routes through `changeAppointmentStatus`.

## Fix

Update the View Details modal so status changes use the same canonical status-change path as the portal card dropdown.

1. Import and use `changeAppointmentStatus` in `DetailedAppointmentView.tsx` for appointment status changes.
2. For `status` updates, stop calling `update-appointment-fields` and `update-ghl-appointment` directly from the detail modal.
3. Preserve the existing dialog behavior:
   - Rescheduled still opens the reschedule dialog
   - Cancelled still opens the cancellation reason dialog
   - No Show still opens the eligibility dialog
4. Add the missing OON confirmation flow inside View Details, matching the card dropdown behavior before applying OON.
5. After a successful detail-modal status change, update local modal state, refresh parent data, and show the existing success/error toast.
6. Keep non-status field edits on the existing `update-appointment-fields` path.

## Expected result

When OON is selected from View Details:
- Portal status becomes `OON`
- GHL appointment is not directly cancelled by the portal
- OON Slack notification fires
- `appointment-oon` is added to the GHL contact
- `appointment-status-webhook` fires so the project workflow can apply `oon pt`
- If no project webhook exists, the portal applies `oon pt` directly as a fallback
- Internal audit note records that GHL was intentionally left for the OON workflow to cancel

## Technical details

- Main file: `src/components/appointments/DetailedAppointmentView.tsx`
- Reuse existing utility: `src/utils/appointmentStatusChange.ts`
- No database changes
- No changes needed to Review Queue or `update-ghl-appointment`
