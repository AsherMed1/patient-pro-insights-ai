## Goal
Barbara Austin (Ozark Regional Vein and Artery Center) shows blank Insurance, Medical & PCP, and Pathology cards on her active appointment.

## Confirmed current state
Two rows exist for her, both `is_superseded=false`, both approved:
- `b3f544fd` — Aug 27, 2026, **Confirmed** (the live one the clinic sees): `parsed_insurance_info`, `parsed_medical_info` all null; `parsed_pathology_info` null except `procedure_type: GAE`. `parsing_completed_at` = 2026-07-23, `parse_attempts` = 0 → stamped "parsed" before the empty-parse guard fix.
- `22122a6f` — Jul 30, 2026, **Cancelled**: fully parsed (BCBS / Basic / ID R6123353 / Group 65006500, PCP Dr Sarah Lynn Edwards 479-667-1590, GAE set).

Same class of record as Reginald Peterson / April Barclay / LaQuan Skinner / Minerva Gonzales — parser already hardened, this row just never got re-run. Notes on the live row contain the identical GHL blob, so a re-parse should populate everything.

## Steps
1. Invoke `auto-parse-intake-notes` with `{ appointmentId: "b3f544fd-89ef-4ef5-8dfb-eadaf842ff6b" }` to force a fresh parse with the hardened parser + deterministic regex fill.
2. Re-query the row and compare field-by-field against the notes and against the already-correct Cancelled row.
3. Apply a small data-correction migration only for whatever the parser still misses — expected candidates:
   - `affected_side` / `affected_knee` — the intake has no side question for this project, so likely left null rather than guessed
   - `imaging_details` = "Xray" (from "Had Imaging Before ?: Xray"), `imaging_done` = YES, `imaging_type` = X-ray
   - `pain_level` 8, `duration` "Over 1 year", `oa_tkr_diagnosed` YES, `age_range` "56 and above", `trauma_related_onset` NO
   - `previous_treatments` "Medications/pain pills, Injections", full symptom list
4. Confirm in the Ozark portal that all three cards render on the Aug 27 appointment.

## Notes
No parser code changes expected — data repair on one record via the existing targeted re-parse path. The Cancelled Jul 30 row is left as-is (already correct). If the re-parse leaves fields blank, I'll report why rather than silently hand-filling.