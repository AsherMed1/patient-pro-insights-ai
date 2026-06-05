## Goal
Import 38 GAE contacts from the uploaded CSV into the **Davis Vein & Vascular** portal as unscheduled `all_appointments` rows (Davis uses `time_preference` capture, not date/time).

## Source
`Export_Contacts_GAE_Jun_2026_10_34_AM.csv` — 38 rows. Columns: Contact Id (GHL), First/Last Name, Phone, Created, Date Lead Was Created, Booked/Insurance Received Tag dates, Insurance ID Number, Clinical Summary (free-text with PCP, insurance, preferred location/appointment, complaint).

## De-dup
8 ghl_ids already exist in `all_appointments` and will be **skipped**:
Edmundo Chavez, Anthony Alex, Helen Roberson, Michael Daigle, Terron Fontenberry, Loretta Brown Freddie, Abron Johnson, Billy Johnson.

→ **30 new rows** will be inserted.

## What gets inserted (per row)
- `project_name` = "Davis Vein & Vascular"
- `ghl_id` = CSV Contact Id
- `lead_name` = "First Last"
- `lead_phone_number` = CSV Phone
- `status` = `Pending`
- `date_of_appointment` = NULL, `appointment_time` = NULL (Davis unscheduled pattern)
- `time_preference` = parsed from Clinical Summary ("Appointment Preference: Morning/Afternoon/Evening") → morning / afternoon / evening / no_preference fallback
- `requested_time` = "Preferred Appointment: …" line if present (raw text)
- `created_at` = CSV "Created" timestamp
- `date_appointment_created` = CSV "Date Lead Was Created"
- `internal_process_complete` = false
- `review_status` = `approved` (Davis is on the auto-approve exempt list, so it skips the review queue)
- `patient_intake_notes` = full Clinical Summary verbatim (so auto-parser can populate insurance/PCP/insights)
- `detected_insurance_provider` / `detected_insurance_plan` = best-effort regex from "Insurance:" / "Provider:" / "Plan:" lines in summary
- Insurance ID Number column → seed into intake notes block so the parser picks it up

## After insert
Trigger `auto-parse-intake-notes` for the 30 new appointment ids in batches so `parsed_*` JSONB fields, demographics, and pathology populate in the portal UI.

## Out of scope
- No code changes, no schema migrations.
- Not importing into `new_leads` table (Davis flow uses `all_appointments` with Pending + time_preference, matching the 5 most recent Davis records).
- Not creating GHL appointments; these are intake/lead records only.

## Technical notes
- Use the `insert` SQL tool for the 30 INSERTs (single multi-row statement).
- Trigger the parser via `supabase--curl_edge_functions` POST to `/auto-parse-intake-notes` with the list of new ids.
- Names with apostrophes will be SQL-escaped.