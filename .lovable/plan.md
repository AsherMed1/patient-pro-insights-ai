## Problem

LaQuan Skinner (Texas Endovascular – Dallas Vein Clinic, FSE at Fort Worth, appt 2026-08-03) shows blank Insurance, Medical & PCP, and Pathology cards.

Verified in the database — two rows exist for him:
- `17155c32` — Confirmed, appt 2026-08-03, the live portal record
- `4a70d53a` — Scheduled, older row from 2026-07-14

Both have the same defect: `parsed_insurance_info` is entirely null, `parsed_medical_info` has only a junk `imaging_details: "No\n"`, and `parsed_pathology_info` has only `procedure_type: "FSE"` (plus `imaging_done`). Both were stamped `parsing_completed_at` with `parse_attempts = 0`, so they will never retry — the same empty-parse-stamp defect fixed for April Barclay and Reginald Peterson.

The intake notes are complete: Superior Ambetter, ID U9798612501, Group 2DSA; full FSE STEP 1–2 pathology (left shoulder, 3–6 months, pain 7–10, difficulty with movement, worse at night, oral medications tried with no relief, no imaging, daily activities affected "a lot"); PCP explicitly "Doesn't have one"; plus a detailed setter note about 8 months of left shoulder pain and ice/heat/Biofreeze/Tylenol.

## Fix

1. Re-run the hardened parser against the live record `17155c32` via the targeted `{ appointmentId }` path — this clears the stale `parsing_completed_at` and runs both the AI pass and the deterministic regex fill.
2. Do the same for the older `4a70d53a` row so its history view isn't blank either.
3. Verify all three parsed objects afterwards and patch any remaining gap with a targeted data correction so the cards match the notes exactly — in particular: affected side Left, duration 3–6 months, pain level 7–10, previous treatments (oral medications; ice, heat, Biofreeze, Tylenol), symptoms/daily-impact, insurance plan Superior Ambetter with ID and group number, PCP recorded as "None".
4. Clean the junk `imaging_details: "No\n"` so the Medical card reads correctly (no imaging performed).

## Notes

No parser code changes are needed — the deployed version already ignores `procedure_type` in the empty-parse guard. Only LaQuan Skinner's two rows are touched.
