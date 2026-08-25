# Show Smoking/Tobacco and Medical Conditions in Medical Information

## What's happening now

For the AVA Test record in AVA Vascular, the GHL intake clearly contains:

- `PAD Step 2 | Do you smoke or use tobacco products?: Former`
- `PAD Step 2 | Select the following medical conditions that apply to you: Heart attack, Kidney disease`

But the saved parsed data for that record only has `blood_thinners`, `open_wounds`, `pad_diagnosed`, `vascular_provider`, `pain_to_toes`, `numbness_cold_feet`, `worse_when_walking` — no smoking status and no medical conditions. So the Medical Information card has nothing to display.

Cause: the intake-notes enrichment step only recognizes smoking labels written as `Smoking Status:`, `Tobacco Use:` or `Smoker:`. The real label is a question ("Do you smoke or use tobacco products?"), so it never matches. There is no extraction rule at all for the "Select the following medical conditions" answer.

The display card already has a "Smoking Status" row, so once the value is captured it will show up. Medical conditions need a new row.

## Changes

1. **Parser (`auto-parse-intake-notes`)**
   - Broaden the PAD smoking extraction to also match question-style labels: "do you smoke", "smoke or use tobacco", "tobacco product(s)", plus existing labels. Normalize the value as-is (Former / Current / Never / No).
   - Add extraction for comorbidities: match "select the following medical conditions…", "medical conditions that apply", "medical conditions" and store as `medical_info.medical_conditions` (comma list preserved, e.g. "Heart attack, Kidney disease").
   - Keep the GHL custom-field mapper consistent: route the medical-conditions field to `medical_info.medical_conditions` instead of only `pathology_info.diagnosis`, and let the smoking branch accept the question-style key.
   - Both rules stay scoped so unrelated text (addresses, other procedures' steps) can't leak in.

2. **UI (`ParsedIntakeInfo.tsx`)**
   - Add a "Medical Conditions" row in the Medical Information card, rendered as small badges per condition, next to Smoking Status / Blood Thinners.
   - Include the two new fields in the "no pathology answers submitted" empty-state check so the card doesn't falsely say nothing was collected.

3. **Backfill**
   - Re-run parsing for existing PAD appointments whose raw intake notes contain a smoking/tobacco question or a medical-conditions answer but whose parsed data lacks those fields, so records like AVA Test fill in without waiting for a new booking.

## Verification

Confirm the AVA Test record shows `Smoking Status: Former` and `Medical Conditions: Heart attack, Kidney disease`, and spot-check a couple of other PAD records for no regressions (no smoking value derived from street names or unrelated steps).
