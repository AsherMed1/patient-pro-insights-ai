## Diagnosis (verified)

Record `7e7be936-3ca5-4f80-b9ac-81cd4939d7c6` (SHEILA Evans, Richmond Vascular Center, Aug 20 appointment, Confirmed) has rich intake notes but was stamped `parsing_completed_at = Jul 14, 2026` with `parse_attempts = 0` — i.e. it was marked parsed by the old pipeline *before* the empty-parse guard existed. Every field in `parsed_insurance_info`, `parsed_medical_info`, and nearly all of `parsed_pathology_info` is null, and `detected_insurance_provider` / `detected_insurance_id` are null, even though the notes clearly contain the data.

The notes contain all the missing values:
- Insurance: Anthem / plan Anthem, ID `YTW120W06329`, Group `WM2A`; secondary Medicaid, ID `350905893018`
- PCP: Dr. Richard Jackson / 804-225-7148
- GAE pathology: both knees, over 1 year, OA diagnosed NO, sharp pain, medications/pain pills, recent trauma yes, imaging yes (MRI), pain 7/10
- Insurance note describes bilateral knee pain ~1 year, injections and PT tried without relief

## Fix

1. Run `auto-parse-intake-notes` with `forceAppointmentId = 7e7be936-3ca5-4f80-b9ac-81cd4939d7c6` to re-extract everything from the intake notes with the current hardened parser (deterministic GHL-label regex fills + empty-parse guard).
2. Verify the resulting `parsed_*` objects and top-level insurance columns against the values listed above; apply a targeted data fix for any field the parser still leaves blank (notably secondary insurance and the "had imaging before: MRI" detail).
3. Confirm the Patient Portal card renders Insurance, Medical & PCP, and Medical Information sections populated.

## Technical notes

- No code or schema changes expected — this is a data repair using the existing force-reparse path.
- If the parser still returns empty despite rich notes, that indicates the guard isn't catching this note format, and I'll report the specific failing extractor before changing parser code.
