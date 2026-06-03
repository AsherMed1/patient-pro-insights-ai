## Insert Jennifer Britt into Premier Vascular

Manually create an unscheduled lead record for Jennifer Britt in Premier Vascular's portal using the details provided.

### Patient data
- **Name:** Jennifer Britt
- **Project:** Premier Vascular
- **GHL ID:** nfGcyVjDn8MjmgWjhEOn
- **Phone:** (478) 258-8754
- **Email:** jwpooh68@gmail.com
- **DOB:** 1968-12-10 (Age 57)
- **Insurance:** Cigna Healthcare — Open Access Plus, Member ID U62091059 02, Group 3347005, Effective 01/01/2026
- **Insurance card images:** Front + back uploaded (Cigna)

### Steps

1. **Upload insurance card images** to the `insurance-cards` storage bucket (front + back), capture public URLs.
2. **Insert row** into `all_appointments` via migration with:
   - `lead_name`, `project_name='Premier Vascular'`, `ghl_id`, phone, email, `dob`
   - `is_unscheduled=true`, `status='Pending'` (Premier Vascular unscheduled pattern), `review_status='pending'` (admin will approve), `internal_process_complete=false`
   - `time_preference` left null (no preference provided)
   - `parsed_contact_info`, `parsed_demographics` (with age 57), `parsed_insurance_info` populated
   - `detected_insurance_provider='Cigna'`, `detected_insurance_plan='Open Access Plus'`
   - `insurance_id_link` (front), `insurance_back_link` (back)
   - `patient_intake_notes` formatted with contact + insurance sections
   - `date_appointment_created=now()`

### Notes
- Follows the manual-insert pattern from existing utilities (e.g. `insertRhondaKettles`, `updateTeresaGriffinIntake`) and the Premier Vascular unscheduled-capture rule.
- Will land in the Review Queue (Premier Vascular is not exempt) — admin must Approve to surface in client portal.
