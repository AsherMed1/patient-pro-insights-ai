---
name: GHL reconciliation push precedence
description: The 15-min GHL time-reconciliation sweep must never overwrite a clinic change GoHighLevel hasn't accepted yet; it retries the push instead.
type: feature
---

`sync-ghl-appointment-times` (cron, every 15 min) treats GoHighLevel as authority for date/time **only** when the portal has no outbound push owed.

Rules:
- A row is "push-pending" when it has an unprocessed `appointment_reschedules` row with `ghl_sync_status` in (`pending`,`failed`), or `all_appointments.last_ghl_sync_status` is `pending`/`failed` — in both cases only within a 24h retry window (`last_ghl_sync_at` / reschedule `created_at`).
- Push-pending rows are never overwritten. The sweep re-invokes `update-ghl-appointment` with the portal values and records `push_retried` / `push_failed`.
- After 24h the protection expires and the row returns to normal drift checking, so stale sync flags can't freeze reconciliation forever.
- Failed pushes always stamp `all_appointments.last_ghl_sync_status='failed'` + the reschedule row, and write an internal `appointment_notes` entry. The UI shows a persistent "Not synced to GoHighLevel" warning with a Retry action on the appointment card and in View Details.

Known GHL behavior: a GHL event that was cancelled in GHL rejects every subsequent update with `"The event id is invalid"` (400). Restoring the portal status to Confirmed does NOT revive the GHL event — it must be re-booked in GHL.
