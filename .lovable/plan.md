## What's wrong

Sidney Pye's Davis Vein & Vascular record (`c990df36`, created Jun 15, status Pending) was parsed on Jun 15 — before the markdown-slurp hardening — and stored garbage:

- Insurance Provider **and** Plan both literally read `** insurance_provider: UNITEDHEALTHCARE` (the markdown header line got slurped)
- Insurance ID and Group Number: empty
- Medical & PCP Information: completely empty (no PCP name/phone, no imaging)
- Pathology: completely empty (no procedure type, duration, pain level, affected side, OA diagnosis)

The intake notes on this record are rich (3,809 chars) and contain everything needed: UnitedHealthcare, ID 976708091-00, Group 90122, Plan HMO/POS (Orbit Advantage), PCP George Stokes / 281-592-2888, GAE, right knee, pain 7–8/10, swelling/limited mobility, steroid + gel injections, prior left knee surgery, no imaging yet, 56 and above, over 1 year, OA yes.

His two later Humble Vascular Surgery Center records (Jul 11 and Jul 15) parsed correctly and can be used as a cross-check.

## Fix

1. Force a re-parse of appointment `c990df36` through `auto-parse-intake-notes` (the `appointmentId` force parameter). The current hardened parser rejects `**`-prefixed and URL-like insurance candidates, so the corrupted provider/plan will be scrubbed on the write path rather than preserved.
2. Verify the re-parse result. Fill any field the parser still misses with a direct data update so the card is complete:
   - Insurance: UnitedHealthcare / HMO POS / ID 976708091-00 / Group 90122
   - Medical & PCP: Dr. George Stokes, 281-592-2888; imaging not yet done (X-ray/MRI planned)
   - Pathology: GAE, right knee, over 1 year, OA yes, pain 7–8/10, symptoms swelling + limited mobility, prior treatments steroid injections / gel injections / prior left knee surgery
3. Keep both top-level columns (`detected_insurance_*`, `dob`) and the `parsed_*` JSONB objects in sync, per the data-integrity rule.

No schema or UI changes — this is a data repair plus one forced parser run.

## Note on the record itself

The notes for this Davis record reference Kingwood, TX / Humble locations and the same patient later appears twice under Humble Vascular Surgery Center. Repairing this record won't merge or dedupe anything — tell me if you also want the Davis entry retired as a duplicate rather than filled in.
