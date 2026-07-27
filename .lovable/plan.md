## Problem

April Barclay (Fayette Surgical Associates, portal ID `c74c2331`, appt 2026-08-03, GAE at Pasadena Dr, Lexington KY) shows blank Insurance, Medical & PCP, and Pathology cards.

Verified in the database:
- `parsed_insurance_info`, `parsed_medical_info`, `parsed_pathology_info` exist but every value is `null` — the only non-null key is `procedure_type: "GAE"`.
- `parsing_completed_at` is stamped (2026-07-26 19:15:18) with `parse_attempts = 0`, so the record was marked "parsed" and will never be retried.
- `patient_intake_notes` is rich and complete: UHC Commercial / UHC Choice Plus / ID 920328821 / Group 933201, PCP Elizabeth Briggs, NP / 859-624-6366, full GAE STEP 1–2 pathology (right knee, OA yes, over 1 year, pain 5/10, symptoms list, injections + physical therapy, imaging yes, trauma yes), DOB 1972-04-11.

This is the same `procedure_type`-fools-the-empty-guard case already fixed in `auto-parse-intake-notes` — her row was stamped before that fix went live, so it stayed blank.

## Fix

1. Trigger the already-hardened parser against this single record using the targeted `{ appointmentId: "c74c2331-..." }` path, which clears the stale `parsing_completed_at` and re-runs both the AI pass and the deterministic regex fill.
2. Verify the three parsed objects afterwards; fill any remaining gap (e.g. imaging "Yes, not recently", affected side Right) with a targeted data correction so the portal cards match the intake notes exactly.
3. No parser code changes needed — the current deployed version already ignores `procedure_type` in the empty-parse guard, so no new records will land in this state.

## Notes

Only April Barclay's row is touched. This is the same repair already applied to Reginald Peterson; the remaining sibling rows from that audit list stay untouched unless you ask for them.
