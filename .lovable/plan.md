# Add Linda Beeler to the Ozark portal (manual, no alerts)

Insert one appointment row for **Ozark Regional Vein and Artery Center** so the clinic sees Linda Beeler immediately, with no GHL connection and no alerts fired.

## Patient record

- Name: LINDA BEELER
- DOB: 12/11/1953 (age 72)
- Phone: 479-212-4115
- Address: 928 S 28TH, Rogers, AR 72758
- Service: GAE (calendar: "Request your GAE Consultation at Rogers, AR" — matches the clinic's existing GAE records)
- Appointment: Sep 15, 2026 at 4:00 PM
- Insurance: Medicare 8V03TH6CA99 (primary) / Humana H65279614 (secondary)

## How it stays quiet

- **Approved on arrival:** the row is created already approved and in the clinic-visible state, so it never enters the Review Queue and no review/pending alert is raised.
- **No short-notice alert:** the appointment is ~18 days out, well outside every Ozark notice threshold.
- **No OON flag from us:** the potential-OON check is pre-resolved on this row so it does not land in QA Hold and no OON Slack alert fires. The clinic can still set the status to OON themselves from the portal, which follows the normal clinic-side flow.
- **No GHL contact or event IDs:** the row is fully detached, so no sync, no outbound push, no webhook echo, and no confirmation text.
- **No auto-parse churn:** intake notes and the parsed insurance / pathology / contact / demographics blocks are written directly with the values above, and parsing is stamped complete so the AI re-parse job skips it.

## Technical detail

Single data-change statement against `all_appointments`:

- `project_name = 'Ozark Regional Vein and Artery Center'`, `status = 'Confirmed'`, `review_status = 'approved'`, `review_stage = 'new'`, `is_superseded = false`, `is_unscheduled = false`
- `date_of_appointment = 2026-09-15`, `requested_time = '16:00:00'`, `date_appointment_created` = today
- `ghl_id`, `ghl_appointment_id`, `ghl_location_id` all left `NULL` (detached)
- `dob = 1953-12-11`, top-level `lead_name` / `lead_phone_number` plus matching `parsed_contact_info`, `parsed_demographics` (dob + age 72), `parsed_insurance_info` (Medicare primary + Humana secondary with both IDs), `parsed_pathology_info` (procedure GAE)
- `detected_insurance_provider = 'Medicare'`, `detected_insurance_plan = 'Medicare'`, `detected_insurance_id = '8V03TH6CA99'`
- `patient_intake_notes` written in the standard Contact / Insurance / Pathology format
- `internal_process_complete = false`, `parsing_completed_at` stamped, `potential_oon_resolved_at` stamped
- Follow-up: verify the row renders in the Ozark portal and confirm no QA Hold / short-notice / OON entries were created for it.

No application code changes.
