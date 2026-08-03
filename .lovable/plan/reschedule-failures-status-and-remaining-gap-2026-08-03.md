# Reschedule failures: status and remaining gap

## What is already fixed

- **The "Action Failed / fail" error is resolved.** Its root cause was a database trigger (`recapture_mark_recovered_on_link`) that compared a UUID against an empty string, which aborted the whole update whenever a reschedule touched a recapture-linked appointment. The trigger no longer contains that comparison (verified against the live database), so the save path no longer throws.
- **Errors are no longer silent.** The reschedule flow in the appointment card now surfaces the actual database/API error text in the toast instead of a generic failure message, and reschedule request rows are marked processed with success/failure details.

So the exact Shunn Morrise failure should not recur.

## The gap that remains

Rescheduling changes the date and time only. It does not move the appointment to a different clinic location/calendar. In the Shunn Morrise case the new time was in Hendersonville, but the appointment stayed on the Nashville calendar in both the portal and GHL until it was moved by hand.

If nothing changes, any reschedule that also changes location will keep silently leaving the patient on the old calendar.

## Proposed fix

1. In the reschedule dialog, show the appointment's current location/calendar and let the user optionally pick a different one from the project's available calendars (same list the existing calendar dropdown uses).
2. When a different calendar is chosen, perform the GHL move and the date/time change together, preserving the appointment duration, and roll the local record forward in one step.
3. Write a single audit note recording both the time change and the location change.
4. If the calendar move fails, show the real error and leave the appointment unchanged rather than partially applying the reschedule.

## Technical notes

- Reschedule logic lives in `src/components/appointments/AppointmentCard.tsx` (the `appointment_reschedules` write path).
- Calendar list and transfer already exist via the `get-ghl-calendars` and `update-ghl-appointment` edge functions used by the calendar dropdown; reuse them rather than adding new endpoints.
- Keep the two-phase Confirm/Cancel commit behaviour of the date/time popover intact.
