# Prevent spurious GHL cancellations (Lisa Lowe case)

## What happened
Lisa Lowe's appointment was created as Confirmed from a GoHighLevel webhook, then cancelled 36 seconds later by a second GoHighLevel webhook. No portal user touched it. GoHighLevel still shows the appointment as confirmed for Jul 29, so the cancel signal was spurious. Once the portal recorded "Cancelled" (a terminal status), later GoHighLevel updates were blocked from restoring it, so the clinic lost the patient off their schedule while the patient kept getting confirmation messages.

## Fix

### 1. Restore Lisa Lowe
Set the appointment back to Confirmed and add an explanatory note on the record so the clinic sees why it changed.

### 2. Log every inbound GoHighLevel webhook
Add a `ghl_webhook_events` table capturing the raw payload, detected format, contact and appointment IDs, project, incoming status, and what the portal did with it. Admin-only visibility. Without this we cannot identify which GoHighLevel workflow is emitting the bogus cancel.

### 3. Harden the cancel path in `ghl-webhook-handler`
Two guards, applied only to incoming cancellations:

- **Fresh-booking guard:** if a cancel arrives within 10 minutes of the appointment row being created and the appointment date is still in the future, call the GoHighLevel appointment API and read the live status. Apply the cancel only if GoHighLevel actually reports cancelled. Otherwise ignore it and log the rejection.
- **Source guard:** only accept a cancellation from an appointment-scoped event (payload carries an appointment object / appointment id). Generic contact or workflow payloads that merely happen to include a "cancelled" string no longer flip a confirmed appointment.

Any rejected cancel is written to the webhook log and to a note on the appointment so it is visible instead of silent.

### 4. Sweep for other victims
Run the existing `verify-ghl-appointment-status` function in sweep mode across future-dated appointments the portal marked Cancelled, list every record where GoHighLevel still says booked, and restore them with an audit note.

## Technical notes
- New table `public.ghl_webhook_events` with indexes on contact id, appointment id, and received time; RLS restricted to admins; service role writes.
- Guard logic sits in `supabase/functions/ghl-webhook-handler/index.ts` just before the status field is applied in `getUpdateableFields` / the update branch.
- Live verification reuses the `GET /calendars/events/appointments/{id}` call already implemented in `verify-ghl-appointment-status`.
- Verification failures (API error, no key) fall back to the current behavior of accepting the cancel, so we never drop a real cancellation.
