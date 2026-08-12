# Keep Review Queue dates in sync with GoHighLevel

## What we found on Reginald Wilson

His live portal row (Georgia Endovascular, GHL event `1czVyzsXkQk7X2H2iiZD`) still holds **Aug 14, 9:00 AM** while GHL holds **Aug 18, 1:00 PM**. The row's reschedule history is completely empty, so the portal never applied any date change to this record — it is not a display bug.

The record was created at 19:27:53 UTC on Aug 6, and the GHL conversation shows the rebooking confirmation going out at 2:28 PM — about a minute later. The webhook handler has a 120-second "echo-back debounce": if a row was written in the last 120 seconds, the incoming date and time are deliberately ignored while other fields still update. A genuine reschedule that lands within two minutes of booking is therefore silently dropped, and nothing ever re-checks it. That matches this record exactly, though the Aug 6 function logs are past their retention window, so it is the strongest supported explanation rather than a logged certainty. The first plan step re-verifies against GHL before anything else.

## The fix

1. **Make the debounce echo-aware instead of time-aware.** Suppress the update only when the incoming date/time is the *same* as what we already store (a true echo-back of our own write). When GHL sends a date or time that differs from the stored value, apply it — regardless of how recently the row was touched. This closes the "rescheduled within 2 minutes of booking" hole without reintroducing echo loops.

2. **Add a reconciliation sweep so drift can never sit unnoticed.** A new scheduled job pulls the live appointment from GoHighLevel for every non-superseded row that is awaiting review (New / Pending Review) or booked in the future, compares date, time, calendar and status, and corrects the portal row when they differ — writing a reschedule-history entry and an audit note exactly as a webhook reschedule would. Runs every 15 minutes, same pattern as the existing short-notice sweep.

3. **Let a reviewer force a check on demand.** In the Review Queue, a per-row "Sync with GHL" action (and a queue-level refresh that runs the same check for the visible rows) re-pulls from GoHighLevel and updates the row immediately, so nobody has to wait for the next sweep.

4. **Correct Reginald Wilson's record now** — pull his live GHL appointment, set the date/time (Aug 18, 1:00 PM if GHL still shows that), and log the correction in his history and notes.

5. **Report any other drifted records.** The first sweep run reports every mismatch it finds so we can see whether other patients were hit by the same debounce hole before fixing them in the same pass.

## Technical notes

- Debounce change is in `updateAppointmentFields` in `supabase/functions/ghl-webhook-handler/index.ts`: replace `secondsSinceUpdate < 120` with a comparison of `webhookData.date_of_appointment` / `requested_time` against `existingAppointment` values; only skip when both match.
- New edge function `sync-ghl-appointment-times`, modelled on `verify-ghl-appointment-status` (read path) plus the reschedule write path from the webhook handler: `GET /calendars/events/appointments/{id}`, convert `startTime` into the project timezone, update `date_of_appointment`, `requested_time`, `calendar_name`, push `reschedule_history`, insert an `appointment_notes` audit row. Supports `{ appointment_ids }`, `{ sweep: true }` and a `dry_run` mode.
- Schedule via `pg_cron` + `pg_net` every 15 minutes, matching the existing `sweep-short-notice-pending` job.
- Review Queue UI changes live in `src/components/admin/ReviewQueue.tsx`; the sync action invokes the new function and refetches the row.
- No schema changes required.
