## Goal

Produce a one-off Excel + CSV dataset for **Prospero Vascular and Interventional**, appointments **created (set) between Apr 1 and Jun 30, 2026** — 127 records — measuring the gap between appointment creation and Welcome Call completion, against final outcome.

## Where the data comes from

- `all_appointments` (Prospero, `date_appointment_created` in range) — patient name, set date/time (`created_at`), scheduled date/time (`date_of_appointment` + `requested_time`), current `status`, `cancellation_reason`.
- **Welcome Call timestamp**: there is no dedicated column. Welcome Call is a *status*, and each transition is written to `appointment_notes` as `Status changed from "X" to "Welcome Call" by <user>`. The earliest such note per appointment is the Welcome Call completion time. Verified: 41 of the 127 Prospero Q2 appointments have one; the remaining 86 count as "Welcome Call not completed".
- Cross-check against `audit_logs` portal_update rows for the same transition to catch any note-less cases.

## Output columns

Patient Name · Project · Appointment Set Date/Time · Scheduled Appointment Date/Time · Welcome Call Completed Date/Time · Hours Elapsed (creation → Welcome Call, 1 decimal) · Elapsed Bucket · Final Outcome · Cancellation/Disqualification Reason · Welcome Call Before Scheduled Appointment (Yes/No/N-A) · Portal ID

**Elapsed buckets:** Under 24h · 24–48h · 48–72h · More than 72h · Welcome Call not completed

**Outcome mapping** (current Q2 status counts): Showed 9 · Cancelled 54 · No Show 14 · Disqualified = OON 40 · plus still-open records (Welcome Call 4, Confirmed 4, Scheduled 2) reported as "Open / No final outcome" so they don't distort the analysis.

All timestamps rendered in the project's timezone (falling back to Central), matching portal display.

## Deliverables

1. `prospero_welcome_call_timing_q2_2026.xlsx`
   - **Raw Data** — one row per appointment, all columns above
   - **Summary by Bucket** — count and % per elapsed bucket, cross-tabbed by outcome with show rate per bucket
   - **Summary by Outcome** — counts, avg/median hours to Welcome Call, % with Welcome Call completed before the appointment
2. `prospero_welcome_call_timing_q2_2026.csv` — the Raw Data sheet only

Both written to your documents area for download. No app code or schema changes.

## Caveats to flag on delivery

- Welcome Call timing only exists where the status actually passed through "Welcome Call" in the portal; calls logged only in GHL won't appear.
- 86 of 127 have no Welcome Call event recorded, so the correlation sample is 41 appointments.
