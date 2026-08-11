# Add location selection to the Reschedule Appointment window

## Current state

There are two reschedule dialogs in the portal:

- The appointment card dialog (`AppointmentCard.tsx`) already lets the user pick a different calendar/location as part of the reschedule, moves the appointment in GoHighLevel, and records the location change in the audit note.
- The detailed appointment view dialog (`DetailedAppointmentView.tsx`) — the one in the screenshot with "Submit Reschedule Request" — only offers date, time and notes. It has no current-location display and no way to change location, so a reschedule made from this window always leaves the appointment on the original calendar.

This is the gap behind the wrong-location risk.

## What will change

Bring the detailed view's reschedule window to parity with the card version:

1. Show the appointment's current location/calendar in the "Current Appointment" summary block, alongside the current date and time.
2. Add a **Location** selector listing the project's available GoHighLevel calendars, defaulted to the appointment's current calendar. Leaving it untouched behaves exactly as today.
3. When a different location is chosen, the date/time change and the calendar move are sent to GoHighLevel together, preserving the appointment duration, and the portal record's calendar name is updated in the same step.
4. The audit note records both changes in one line, e.g. `Rescheduled | FROM: ... | TO: ... | LOCATION: Nashville -> Hendersonville | By: <user>`.
5. If the GoHighLevel move fails, the real error text is shown and the appointment is not left half-moved; the reschedule request row is marked failed with the error for diagnosis.
6. While calendars are loading or unavailable (project not linked to GoHighLevel), the selector shows the current location read-only so the date/time reschedule still works.

## Technical notes

- Reuse `useGhlCalendars` and the existing `update-ghl-appointment` edge function with `calendar_id` and `title`, exactly as `AppointmentCard.handleRescheduleSubmit` does — no new endpoints or schema changes.
- Fetch calendars when the dialog opens; default `rescheduleCalendarId` by matching `appointment.calendar_name` case-insensitively.
- Persist `calendar_name` on `all_appointments` only when the move succeeds (or when there is no linked GoHighLevel appointment, in which case it is a local-only update, matching current behaviour).
- Keep the existing status reset to `Confirmed`, `internal_process_complete = false`, and the `appointment_reschedules` tracking row untouched apart from the added location fields in the note/error path.
