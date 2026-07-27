## Problem

Gregory Washington (Texas Endovascular - Houston Vein Clinic, appointment `afecfa85-83cd-4760-b313-c0c9ff44eba2`, Jul 29 2026) has rich GHL intake notes but the parsed cards are empty. Confirmed in the database:

- `parsed_insurance_info` — every field null (notes clearly contain UHC / United Healthcare, ID 523739306)
- `parsed_medical_info` — every field null (notes contain PCP "philip Johnson")
- `parsed_pathology_info` — only `procedure_type: FSE`, all clinical fields null
- `parsing_completed_at` = Jul 20, `parse_attempts` = 0 — the record was parsed before the recent parser hardening and never retried

Demographics (DOB 1964-02-11, age 62) did populate correctly.

## Fix

1. Force a re-parse of this appointment through the `auto-parse-intake-notes` edge function using `forceAppointmentId`, so the current hardened parser processes the notes.
2. Verify the resulting JSONB. Where the parser still leaves gaps, apply a targeted SQL update to fill from the intake notes:
   - Insurance: provider UHC (United Healthcare), plan United Healthcare, ID 523739306
   - Medical: PCP name Philip Johnson (no phone in notes)
   - Pathology (FSE): right shoulder, duration 6–12 months, pain 7–10, worse at night / lying on affected side, difficulty with shoulder movement, no recent injury or surgery, no prior treatments, no imaging done
3. Re-query the record to confirm all three cards populate, and confirm the appointment still shows as Scheduled / approved and non-superseded.

No parser or UI code changes are proposed here — this is a data repair for one record using the existing hardened parser.
