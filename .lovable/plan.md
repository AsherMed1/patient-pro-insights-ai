## Diagnosis (verified)

Record `3de04e09-f3c7-40da-92a9-0b08be2b7370` (LaDonna Mondesir, Richmond Vascular Center, Jul 10 appointment, Confirmed) has the same stale-parse problem as Sheila Evans: `parsing_completed_at = Jun 25, 2026`, `parse_attempts = 0`, and every field in `parsed_insurance_info` and `parsed_medical_info` is null, plus `detected_insurance_provider` is null — even though the intake notes contain the data.

Available in the notes but not parsed:
- Insurance: Anthem, ID `TJA3320498SF`, Group `JVA011M003`, insurance card image link present
- Imaging: "Had Imaging Before?: No I had. CT scan" → CT scan
- Procedure UFE / Fibroids, uterus (already correct)

Note: this GHL submission contains no PCP name/phone and no UFE pathology step answers, so those fields will legitimately stay blank.

## Fix

1. Re-run `auto-parse-intake-notes` with `appointmentId = 3de04e09-f3c7-40da-92a9-0b08be2b7370` so the current hardened parser re-extracts from the notes.
2. Verify the resulting fields against the values above (insurance provider/plan/ID/group, imaging CT scan, insurance card link).
3. Apply a targeted data fix for anything the parser still leaves blank that is clearly present in the notes.

## Technical notes

- Data repair only, no code or schema changes expected.
- The parser force parameter is `appointmentId` (not `forceAppointmentId`).
