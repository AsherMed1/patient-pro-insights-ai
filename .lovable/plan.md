# Sync GHL Appointment Time on Refresh

## Root cause
GHL only fires its outbound webhook reliably for status changes — pure time edits (2PM → 1PM) for Lenora M Graham (`odxVhlK48fu6lg5YFDNH`) never hit `ghl-webhook-handler` (no logs found). The portal's per-appointment "Refresh from GHL" button (`fetch-ghl-contact-data`) already pulls the live GHL appointment object to derive `contactId`/`locationId`, but throws away `startTime` — so even a manual refresh can't recover the new time.

## Changes

### 1. `supabase/functions/fetch-ghl-contact-data/index.ts`
After the existing GHL appointment fetch (lines ~76–117), also extract `startTime`, convert to the project's timezone, and reconcile against the portal:

- Load `projects.timezone` along with the API key/location.
- Parse GHL `appt.startTime` → derive new `date_of_appointment` (YYYY-MM-DD) and `requested_time` (HH:mm:ss) in project timezone.
- If either differs from the existing appointment row:
  - Append a `reschedule_history` entry (previous_date/time, new_date/time, changed_at, previous_status, source: `ghl_refresh`).
  - Set `status = 'Confirmed'`, `internal_process_complete = false`, `was_ever_confirmed = true` (mirrors webhook reschedule path; honors recovery from portal-only terminal).
  - Insert an `appointment_notes` row: `Rescheduled | FROM: <old date+time> | TO: <new date+time> | By: GoHighLevel (manual refresh)` with `created_by = 'GoHighLevel'`.
- Apply these together with the existing notes/phone/email update (single update call).

### 2. One-off correction for Lenora M Graham (data write)
Migration / insert tool:
- Update `all_appointments` id `79d230e6-07f9-49f7-88e2-f3258f92f8eb`: `requested_time` → `13:00:00`, append reschedule_history entry (2PM → 1PM, source: `manual_correction`).
- Insert `appointment_notes` row documenting the correction (`By: System`).

### 3. Memory update
Extend `mem://integrations/ghl-refresh-pipeline` to note the Refresh button now also reconciles `date_of_appointment`/`requested_time` with the same audit + reschedule semantics as the webhook handler.

## Out of scope (call out to client)
True automatic sync requires NGV to enable a GHL outbound webhook on Appointment **Update** (not just Status Change). The Refresh button is the manual recovery path until that's configured.

## Files
- Edit: `supabase/functions/fetch-ghl-contact-data/index.ts`
- Edit: `mem://integrations/ghl-refresh-pipeline`
- New migration: data-only update for Lenora Graham + audit note