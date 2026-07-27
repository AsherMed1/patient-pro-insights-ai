## What's wrong

Mar Ward's Richmond Vascular Center record (`992e0d42`, Jun 3, appointment Jul 6, Confirmed) was stamped as parsed on Jun 3 with everything empty except `procedure_type: GAE`:

- Insurance Provider / Plan / ID / Group: all blank
- Medical & PCP Information: blank (no PCP name or phone)
- Pathology: blank except procedure type (no duration, pain level, OA, symptoms, treatments, imaging)

The intake notes (1,632 chars) contain all of it:

- Insurance: provider "Other", Plan Medicare, ID 2NJ8-JAOTQ10
- PCP: Dr. Charles Barrel — 818501850
- GAE pathology: 56 and above, over 1 year, OA yes, symptoms grinding sensation / instability or weakness / stiffness, treatments injections + medications/pain pills, trauma onset NO, X-ray/MRI/CT YES, pain 10/10
- DOB 1952-11-04 (already stored correctly)

This is the same pre-hardening empty-parse pattern fixed for Sheila Evans, LaDonna Mondesir and Sidney Pye.

## Fix

1. Force a re-parse of appointment `992e0d42` through `auto-parse-intake-notes` using the `appointmentId` parameter.
2. Verify the result and fill any field the parser still misses with a direct data update:
   - Insurance: Medicare (plan), ID 2NJ8-JAOTQ10
   - Medical & PCP: Dr. Charles Barrel / 818501850
   - Pathology: 56 and above, over 1 year, OA YES, pain 10, symptoms and prior treatments as listed, trauma onset NO, imaging done YES
3. Keep the top-level `detected_insurance_*` columns in sync with the `parsed_*` JSONB objects, per the data-integrity rule.

No schema or UI changes — data repair plus one forced parser run.
