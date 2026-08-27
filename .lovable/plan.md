# Stop GoHighLevel from reverting clinic reschedules

## What happened to Bella Kumar

Champion Heart and Vascular Center, appointment on Aug 28.

1. 17:26:33 UTC — Challene rescheduled 10:30 AM to 9:00 AM in the portal. The portal wrote the new time locally right away.
2. 17:26:38 UTC — the push to GoHighLevel **failed** (`last_ghl_sync_error: "Edge Function returned a non-2xx status code"`). GHL still held 10:30 AM. The reschedule row is still sitting at `ghl_sync_status: pending`.
3. 17:31:06 UTC — the 15-minute GHL reconciliation sweep read GHL (10:30), saw the portal at 9:00, classified it as drift and wrote 10:30 back over the clinic's change. That is the note in the screenshot: "Appointment date/time re-synced from GoHighLevel | FROM: 09:00:00 | TO: 10:30:00".

So GHL didn't change anything — the portal reverted itself because the outbound push failed and the sweep assumes GHL is always right. The clinic has already emailed the patient about 9:00 AM, and both the portal and GHL currently say 10:30 AM.

The exact reason the GHL push returned a non-2xx is no longer in the function logs, so step 1 below re-runs it to capture it.

## The fix

**1. Recover Bella Kumar now.** Retry the 9:00 AM push to GoHighLevel and capture the exact error if it fails again (most likely causes: the 9:00 slot isn't open on that calendar, or GHL rejected the update for a missing assigned user). Once GHL accepts it, set the portal row back to 9:00 AM and log a correcting internal note. If GHL rejects 9:00 outright, report the reason back rather than silently leaving either system wrong.

**2. Never let the sweep overwrite an unconfirmed clinic change.** The reconciliation sweep will skip any row whose last GHL sync is `pending` or `failed`, and any row with an unprocessed reschedule request. A clinic change that GHL hasn't accepted yet is not "drift" — the portal is the source of truth until the push succeeds. Instead of overwriting, the sweep retries the outbound push.

**3. Retry failed pushes automatically.** The same 15-minute job re-attempts pushes stuck in `pending`/`failed`. On success it marks the reschedule processed; after repeated failures it stops retrying and escalates (step 4).

**4. Make a failed push impossible to miss.** Today the only signal is a toast that disappears. Add a persistent "Not synced to GoHighLevel" warning on the appointment (card and View Details) with a manual Retry action, plus an internal note recording the failure and its reason, so no one assumes the change landed.

**5. Fix the reschedule bookkeeping bug.** In the failure path the `appointment_reschedules` row was left at `pending` instead of `failed` (Bella's row still is), so failures are invisible in the data. The failure branch will reliably stamp the reschedule row.

## Technical notes

- `supabase/functions/sync-ghl-appointment-times/index.ts`: add `last_ghl_sync_status`, plus a lookup of unprocessed `appointment_reschedules`, to the row select; treat `pending`/`failed` rows as "push-pending" — skip the overwrite, attempt `update-ghl-appointment` with the portal values, and record the outcome. Report these separately in the summary (`push_retried` / `push_failed`).
- `src/components/appointments/DetailedAppointmentView.tsx` (`handleRescheduleSubmit`): ensure the catch branch always updates the `appointment_reschedules` row by id, and insert an internal `appointment_notes` entry describing the failed GHL push.
- Warning badge + Retry driven off `last_ghl_sync_status = 'failed'` in `AppointmentCard.tsx` / `DetailedAppointmentView.tsx`; Retry invokes `update-ghl-appointment` and clears the flag on success.
- Bella Kumar: appointment `f6708094-9f01-4217-9e25-ade5d2036149`, GHL event `ntkxKSA9rxbVGpBMIZM5`.
- No schema changes.
