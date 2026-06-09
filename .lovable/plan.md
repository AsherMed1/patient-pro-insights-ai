# Plan: Eliminate Incomplete Patient Pro Insights

Address the 4 failure classes uncovered investigating the TEST DoNotContact lead (and ECCO records) so Patient Pro Insights stops showing blank/garbage fields when the source data actually contains them.

## 1. Post-AI regex enrichment in `auto-parse-intake-notes`

After the GPT response is parsed, run deterministic regex extractors against `patient_intake_notes` and fill any field GPT left null. Same pattern already used for imaging.

**Insurance (writes to `parsed_insurance_info`):**
- `Insurance Provider:` → `provider`
- `Insurance Plan:` → `plan`
- `Insurance ID Number:` → `insurance_id_number`
- `Insurance Group Number:` → `group_number`

**Medical (writes to `parsed_medical_info`):**
- `Primary Care Doctor's Name and Phone:` → split into `pcp` and `pcp_phone`
- `Had Imaging Before ?:` / `Imaging:` → `imaging_details`

Only overwrite when the existing parsed value is null/empty — never clobber a real GPT answer.

## 2. Broaden parser prompt to recognize all procedure-prefix questions

Today the system prompt is tuned to `GAE STEP 1 |`, `GAE STEP 2 |`. Extend the prompt so GPT also maps:
- `PAE w/BPH | …`
- `UFE STEP … |`
- `HAE STEP … |`
- `PAD STEP … |`
- `FSE … |`
- generic `<PROC> | <question>` patterns

…onto the same target fields (`symptoms`, `duration`, `previous_treatments`, `primary_complaint`, `pain_level`, `treatments_tried`). This is the root cause LeAnthony's PAE BPH answers and the TEST lead's PAE w/BPH answers were dropped.

## 3. UI null-safe DOB / Age display

In the Patient Pro Insights card (Demographics row), when:
- `dob` is null, OR
- `dob` parses to today's date (test/garbage sentinel), OR
- computed `age === 0`

…render `—` instead of `06/09/2026 / Age 0`. Keep the existing DOB-source priority (top-level `dob` → `parsed_demographics.dob` → fallback objects) from the existing memory rule.

## 4. Backfill existing affected rows

One-shot script (edge function or `supabase--read_query` + update) that:
1. Selects rows where `parsed_insurance_info->>'insurance_id_number' IS NULL` AND `patient_intake_notes ILIKE '%Insurance ID Number:%'` (and the analogous predicates for the other 5 fields).
2. Runs the same regex enrichment from step 1 and writes the JSONB updates.
3. Logs counts per project.

Will retroactively fix LeAnthony Hill, the TEST DoNotContact lead, and the ~24 flagged ECCO records.

## Out of scope
- No changes to the `calendar_name = "Unknown"` composer (Class A) — separate plan, already discussed.
- No fix for genuinely empty GHL source fields (Class B) — requires GHL form changes.
- No changes to Review Queue, status routing, or sync logic.

## Files touched
- `supabase/functions/auto-parse-intake-notes/index.ts` — prompt + post-AI regex (steps 1 + 2)
- `src/components/appointments/…` Patient Pro Insights demographics row (step 3)
- New `supabase/functions/backfill-parsed-fields/index.ts` (step 4)

## Verification
- Re-run parser on TEST DoNotContact: confirm `parsed_insurance_info` has Aetna / Test Plan / 1234 / group, `parsed_pathology_info` has symptoms/duration/previous_treatments, `parsed_medical_info.pcp` = "test doctor".
- Re-run on LeAnthony Hill: confirm `insurance_id_number = 999604480`.
- Open Patient Pro Insights for Tori Hamilton: confirm Age/DOB row shows `—` instead of `0 / 06/09/2026`.
- Run backfill and report per-project enrichment counts.
