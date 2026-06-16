## Manually insert Thomas L Fite appointment

Insert the provided payload directly into `all_appointments` for project "Ozark Regional Vein and Artery Center", preserving date/time exactly as given (no timezone conversion).

### Steps

1. **Pre-check** — query `all_appointments` for `ghl_appointment_id = 'aHPm83VNyKfPKIYj1a57'` to confirm no row exists; if it does, switch to UPDATE instead of INSERT.
2. **Verify project exists** — confirm "Ozark Regional Vein and Artery Center" is in `projects` (orphan prevention rule).
3. **INSERT into `all_appointments`** with:
   - `lead_name`: 'Thomas L Fite'
   - `ghl_appointment_id`: aHPm83VNyKfPKIYj1a57
   - `ghl_id`: CTC0lGOuyJVeIJmMNQpi
   - `status`: 'Confirmed'
   - `date_of_appointment`: 2026-07-01 (DATE, stored as-is)
   - `requested_time`: '13:00:00' (converted from "01:00 PM" to 24h format for TIME column; no TZ shift)
   - `date_appointment_created`: 2026-06-02T20:23:31.193Z (as provided)
   - `lead_phone_number`, `lead_email` (null since empty), `dob` 1944-08-30
   - `calendar_name`, `project_name`, `patient_intake_notes`, `insurance_id_link`
   - `review_status`: 'pending' (Ozark is not an exempt project, so it routes to Review Queue per core rules)
   - `internal_process_complete`: false
4. **Trigger downstream parsing** — invoke `auto-parse-intake-notes` edge function with the new appointment id so insights populate (matches ghl-webhook-handler behavior).
5. **Verify** — re-query the row and confirm fields landed correctly.

### Notes

- Skipping ghl-webhook-handler invocation and writing directly to DB per user's request ("manually insert").
- Not calling Slack review-queue notify (manual backfill, not a fresh webhook arrival) — can add if desired.
- Time stored as 13:00:00 local (no timezone math), exactly as written.
