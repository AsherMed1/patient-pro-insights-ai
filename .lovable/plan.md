# Backfill missing Liberty appointments (Estela Morales, Kenneth Cox) + investigate gap

## Findings so far

- Neither contact exists anywhere in our DB: not in `all_appointments`, not in `new_leads`, not in the raw `ghl_contacts` mirror.
- Liberty Joint & Vascular (`ghl_location_id = OTaY0EuvYFU62nkd8vyw`) is otherwise healthy — 9 appointments synced in the last 3 days, latest 2026-06-25 19:10 UTC.
- `ghl-webhook-handler` logs contain zero entries for either GHL contact ID and zero entries mentioning "Liberty", "Estela", "Kenneth", or the Liberty `locationId`. That means **GHL never fired (or our endpoint never received) the appointment webhook for these two specific bookings.** Everything downstream of the webhook is fine.

Because GHL fired webhooks for other Liberty bookings on the same day, this isn't a systemic outage — it's a per-record webhook miss on the GHL side (transient delivery failure or a workflow filter that excluded these two contacts). We can't reproduce or fully diagnose without GHL's outbound webhook logs.

## What to build

### 1. New edge function `backfill-ghl-appointment`
A reusable admin tool that, given a `{ projectName, ghlContactId }`, pulls the contact + all its appointments straight from the GHL REST API using the project's stored `ghl_api_key`/`ghl_location_id`, then synthesizes the same payload `ghl-webhook-handler` expects and either:
- invokes `ghl-webhook-handler` internally per appointment, or
- performs the equivalent insert directly (same project mapping, `review_status` defaulting, `is_unscheduled` handling, lead-association, intake-note assembly).

Whichever path matches the existing handler exactly, so backfilled rows are indistinguishable from webhook-created ones. Returns a per-appointment result list.

### 2. Run the backfill for the two contacts
Invoke the new function twice from the SQL/admin side:
- `OTaY0EuvYFU62nkd8vyw` / `P7an36yUyWJWRnZB8TWz` (Kenneth Cox)
- `OTaY0EuvYFU62nkd8vyw` / `DeFONco1EVDekWh5aysb` (Estela Morales)

Expected outcome:
- Kenneth Cox: row created with `review_status='pending'` (setter-booked, no Setter-Submitted tag → goes through Review Queue, per existing rules).
- Estela Morales: row created with `review_status='pending'`. User stated she was already confirmed in the Review Queue previously — that prior approval lived only on a ghost record that never existed in our DB, so she'll need to be re-approved once the new row appears. (If she already carries the `approved` tag in GHL, we can short-circuit: the backfill can read `contact.tags` and set `review_status='approved'` when the `approved` tag is present, mirroring what manual approval does.)

### 3. Investigation deliverable (no code, just a written note returned in the response)
- Confirm with the user that the GHL "send appointment webhook" workflow in Liberty's sub-account has no contact-level filters or rate limits that could have skipped these two.
- Ask the user to spot-check GHL's workflow execution history for these two contacts on the booking dates and report back if GHL shows the webhook as "fired" or "skipped/failed". That's the only place the root cause lives — we have no inbound record on our side.

## Technical details

- Edge function uses `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` for inserts.
- GHL calls use the per-project `ghl_api_key` from `projects` (fallback to global `GOHIGHLEVEL_API_KEY`), with `Version: 2021-04-15` and `LocationId` headers, matching the pattern already in `auto-parse-intake-notes` and `all-appointments-api`.
- Endpoints used:
  - `GET /contacts/{id}` — name, phone, email, tags, custom fields.
  - `GET /appointments/?contactId={id}` (or calendar-events variant currently in use by `ghl-webhook-handler`) — every appointment for the contact.
- Tag-based auto-approve: if `contact.tags` includes `approved` OR `Setter Submitted` insurance intake source custom field is set, insert with `review_status='approved'` and skip the Slack review-queue notification — same rules already encoded in `ghl-webhook-handler` and the Review Queue.
- Idempotency: same dedupe path as `all-appointments-api` (match by `ghl_appointment_id`, then by `ghl_id`+project for unscheduled, then by `ghl_id`+`lead_name`).
- Reusable: future "missing patient" reports can be fixed by calling this function with the contact ID, no code change.

## Out of scope

- No DB schema changes.
- No changes to `ghl-webhook-handler` itself — it's working for every other Liberty booking.
- No retroactive GHL workflow modification (that's on the user/GHL side).
