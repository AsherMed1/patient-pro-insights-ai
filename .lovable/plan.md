## Goal
Minerva Gonzales (Ally Vascular and Pain Centers, portal ID `08e46a4d`) shows blank Insurance, Medical & PCP, and Pathology cards even though her intake notes contain all of it.

## Confirmed current state
Queried the record directly:
- `parsed_insurance_info`, `parsed_medical_info` — every key null
- `parsed_pathology_info` — all null except `procedure_type: GAE`
- `parsing_completed_at` = 2026-07-23, `parse_attempts` = 0 → stamped "parsed" before the empty-parse guard fix landed
- Notes DO contain: Oscar / OSCAR plan / ID OSC76794283-01; PCP Dr. Anurda Gurram, (210) 742-6555; GAE STEP data (both knees, over 1 year, OA yes, pain 8/10, swelling/stiffness/sharp pain, injections, imaging yes but "Had Imaging Before?: No" conflict)

This is the same class of record as Reginald Peterson / April Barclay / LaQuan Skinner — already fixed at the parser level, this row just never got re-run.

## Steps
1. Invoke `auto-parse-intake-notes` with `{ appointmentId: "08e46a4d-1adc-4bdb-acd1-d12d51ed58dc" }` to force a fresh parse with the hardened parser + deterministic regex fill.
2. Re-query the row and compare each field against the notes above.
3. Apply a small data-correction migration only for anything the parser still misses or gets wrong — expected candidates:
   - `affected_side` = "Both", `affected_knee` = "Both"
   - `pain_level` = 8, `duration` = "Over 1 year", `oa_tkr_diagnosed` = yes
   - `previous_treatments` = "Injections", symptoms list
   - `imaging_done` — resolve the X-ray/MRI "YES" vs "Had Imaging Before?: No" conflict in favor of the GAE STEP 2 answer (YES), leaving `imaging_when` null
   - PCP name trailing comma stripped → "Dr. Anurda Gurram"
4. Confirm in the portal that all three cards render.

## Notes
No parser code changes expected — this is a data repair on one record using the existing targeted re-parse path. If the re-parse leaves fields blank, I'll report why rather than silently hand-fill everything.
