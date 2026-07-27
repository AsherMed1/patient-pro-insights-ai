## Findings

Deon Greenidge (Texas Endovascular - Houston Vein Clinic, appointment `c5e0164a-dc60-4e8a-966e-3e805ac2eb89`, Aug 7 2026, Scheduled/approved, not superseded). Checked the stored record and intake notes:

- `parsed_insurance_info` — plan CIGNA OPEN ACCESS PLUS, group 3330967, ID "USE PARTICIPANT SSN 01 (0941)" are present, but `insurance_provider` is null
- `parsed_medical_info` — all null
- `parsed_pathology_info` — only `procedure_type: PAE`, everything else null
- Demographics fine (DOB 1974-07-28)

Important: unlike the recent cases, this is **not** a parser failure. The stored intake notes contain no "Pathology Information" or "Medical Information" sections at all — GHL only sent contact + insurance + tracking fields. The notes snapshot is from Jun 22; there is nothing in them for the parser to extract medical or pathology data from.

## Fix

1. Pull the current GHL contact data for this appointment via `fetch-ghl-contact-data`, refreshing `patient_intake_notes` and custom fields. If the patient has since completed pathology/medical intake in GHL, that data lands in the notes.
2. Force a re-parse via `auto-parse-intake-notes` with `forceAppointmentId` so the refreshed notes are processed.
3. Fill `insurance_provider` = "Cigna" (derivable from the CIGNA OPEN ACCESS PLUS plan) via a targeted SQL update if the parser doesn't set it.
4. Re-query and report exactly what populated.

If the GHL refresh returns no pathology or medical fields, that means the intake was never completed on the GHL side — I'll report that back rather than invent values, since the missing shoulder/urinary detail cannot be sourced from anywhere in the record.
