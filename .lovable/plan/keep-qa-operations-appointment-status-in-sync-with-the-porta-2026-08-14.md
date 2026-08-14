# Keep QA Operations appointment status in sync with the Portal

## What's wrong

`qa_cases` stores a frozen copy of the appointment status taken at the moment the alert was raised. Nothing updates that copy afterwards, so when the Portal status later changes the QA record keeps showing the old value.

Confirmed for Steven Cruz: the Portal row is `Cancelled`, but his `confirmed_audit` QA case still stores `Confirmed` (a separate `cancelled` alert was raised correctly — only the older case is stale). The QA drawer already reads the appointment *date* live from the Portal; status is the one field still read from the frozen snapshot.

## Fix

1. **Live read in the UI** — the QA drawer and the queue table read the appointment status from `all_appointments` (the same live lookup already used for date/phone/email) instead of the stored snapshot, falling back to the snapshot only when the appointment row is missing. This makes the drawer correct immediately, even for completed cases.

2. **Keep the stored value in sync (database trigger)** — when `all_appointments.status` changes, update `appointment_status` on every `qa_cases` row pointing at that appointment, regardless of workflow status. This keeps filters, sorting, exports and QA Reports accurate, since those read the stored column rather than the drawer.

3. **Backfill** — one-time update of all existing `qa_cases` rows whose stored status differs from the live Portal status.

## Notes

- Only the status mirror changes. Alert ingestion, dedup, workflow status, escalation and history behaviour are untouched — a cancelled appointment still raises its own `cancelled` alert as it does today.
- Completed QA cases will show the current appointment status; the alert type still records what the case was originally raised for, so history stays readable.

## Technical detail

- New trigger function `qa_sync_appointment_status_from_appointment` on `all_appointments` (AFTER UPDATE OF status), mirroring the existing `qa_sync_appt_date_from_appointment` pattern.
- `QAOperationsQueue.tsx`: extend the existing live-appointment fetch to include `status`, add a `liveApptStatus()` helper for the "Appt status" field, and include status in the row enrichment used by the table/search.
