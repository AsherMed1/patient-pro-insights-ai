## Goal

Produce a downloadable CSV of the 86 appointments that have insurance data in their patient intake notes but no parsed insurance ID, so they can be reviewed one by one before any bulk re-parse.

## What will be produced

A single file, `empty-parse-appointments.csv`, saved to the documents area and attached in chat for download.

Columns:
- Patient name
- Project / clinic
- Created date
- Appointment date
- Appointment status
- Review status
- Portal ID (record ID for opening the record directly)
- Has DOB (yes/no)
- Has PCP name (yes/no)
- Terminal status (yes/no) — flags the ~55 already-closed records so the live-impact ones stand out

Sorted by project, then created date, matching the list already shown in chat.

## Technical detail

Query `all_appointments` where `patient_intake_notes` contains `Insurance ID Number:`, `parsed_insurance_info->>'insurance_id_number'` is null, and `created_at` is within the last 90 days. Export to CSV. This is a read-only export — no records are modified and the self-healing sweep stays off until you say go.
