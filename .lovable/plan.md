## Issue
Juan Barrientos's intake notes contain full insurance + pathology data from the GHL blob, but `parsed_insurance_info` and `parsed_pathology_info` (and the top-level `detected_insurance_*` columns) are empty — so the portal shows no insurance.

The raw `patient_intake_notes` has it all:
- Insurance Plan: BCBS OF TX PPO
- Insurance ID: CQM119605161001
- Group: CQM363
- PCP: Dr. Alice Lim, 713-271-0030
- GAE STEP 1 answers (knee OA, duration, age band)

Parser ran (`parsing_completed_at` is set) but didn't extract these fields on this one row.

## Fix
Re-trigger the AI parser for just this appointment:

1. Null out `parsing_completed_at`, `parsed_insurance_info`, `parsed_pathology_info`, `detected_insurance_*` on appointment `2602c409-aee9-4989-b18f-7d105d65dd71` so it's eligible for reparse.
2. Invoke the `auto-parse-intake-notes` edge function with `{ trigger: 'immediate', appointment_id: '2602c409-aee9-4989-b18f-7d105d65dd71' }` to repopulate the parsed JSON + detected columns from the existing notes.
3. Verify with a follow-up `SELECT` that `parsed_insurance_info.insurance_plan` = "BCBS OF TX PPO", id = "CQM119605161001", group = "CQM363", and that pathology fields populated.

No schema changes. No GHL writes. Single-row, fully reversible (the source `patient_intake_notes` text is preserved).

## Not doing
- Not touching any other appointments.
- Not changing the parser itself — this looks like a one-off miss on a row where parsing completed but extracted nothing. If we see the same pattern on more Humble/GAE rows after this, we'll investigate the parser separately.

Confirm and I'll run it.