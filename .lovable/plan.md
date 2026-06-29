# Backfill Muriel Migkins

Invoke the existing `backfill-ghl-appointment` edge function to pull Muriel's contact and appointments from GHL into our database.

## Call

- Function: `backfill-ghl-appointment`
- Body: `{ "projectName": "Liberty Joint & Vascular", "contactIds": ["qMyGoxdjqWEE4tzOf3N8"] }`

The function uses Liberty's stored `ghl_api_key` + `ghl_location_id`, fetches the contact and all their appointments, and replays them through `ghl-webhook-handler` (idempotent — safe to re-run).

## Verify

After it runs:
1. Query `new_leads` and `all_appointments` for `contact_id`/`ghl_id = qMyGoxdjqWEE4tzOf3N8` to confirm rows were created.
2. Report back the appointment(s) created, their status, and review_status (new appointments default to `pending` in the Review Queue per project rules).

No code or schema changes.
