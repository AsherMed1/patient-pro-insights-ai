## Issue

Jeanette Moore's record (`3fb0151e`) has clean, well-structured intake notes but the parsed fields on the card are mostly empty:

- **Insurance:** provider, plan, ID all `null` — even though notes clearly say `Please select your insurance provider: Medicare Advantage plans`, `Insurance Plan: SELF PAY`, `Insurance ID Number: SELF PAY`.
- **Pathology:** `duration`, `oa_tkr_diagnosed`, `affected_side`, `age_range` all `null` — even though every GAE STEP 1 line is present.
- **Medical:** `pcp_name`, `pcp_phone` `null` — even though `Primary Care Doctor's Name: Dr. Ahmed` and `Primary Care Doctor's Phone Number: 347-338-5111` are present.

Only `procedure_type=GAE`, contact info, and demographics survived the parse.

Notes contain no prompt injection or truncation — this is a straight parser miss, not a sanitization case like Walter Pitts.

## Fix (two steps)

### 1. Immediate: reparse Jeanette Moore

Invoke `reparse-specific-appointments` for `3fb0151e-b5a2-4fd7-bd79-5d61a7abe304`. If the reparse fills the fields, the root cause was a transient LLM miss (empty-result guard didn't fire because `procedure_type` was returned, so the result wasn't "empty").

### 2. Root-cause hardening in `auto-parse-intake-notes/index.ts`

If the reparse still leaves insurance/pathology/medical empty despite the notes being explicit, tighten the parser:

- **Insurance regex fallback** (post-LLM enrichment, similar to how imaging_details already works): when `parsed_insurance_info.insurance_provider` is null, scan the raw notes for `Please select your insurance provider:` / `Insurance Plan:` / `Insurance ID Number:` and backfill. Treat `SELF PAY` as a valid provider/plan value (don't discard it as "not real insurance").
- **GAE STEP 1 regex fallback:** when pathology fields are null, scan for the exact `GAE STEP 1 | <question>: <answer>` pattern and map to `duration`, `oa_tkr_diagnosed`, `affected_side`, `age_range`.
- **PCP regex fallback:** when `pcp_name` / `pcp_phone` are null, scan for `Primary Care Doctor's Name:` / `Primary Care Doctor's Phone Number:` (curly and straight apostrophes) and backfill.
- **Expand the empty-result guard:** currently a result with only `procedure_type` populated passes. Tighten it to also reject when insurance + pathology + medical are all null but the source notes contain the expected section headers — retry once instead of persisting the empty parse.

Only apply the regex fallbacks after the LLM run, only when the field is null, so we don't override any successful LLM extraction.

### Validation

- Reparse Jeanette Moore and confirm the card shows Medicare Advantage / SELF PAY, GAE STEP 1 answers, and Dr. Ahmed's contact info.
- Query for other Liberty Joint & Vascular records with `parsed_insurance_info->>'insurance_provider' IS NULL` but intake notes containing `Please select your insurance provider:` — reparse the batch so this pattern is caught across the project, not just for Jeanette.

## Technical details

- Files touched: `supabase/functions/auto-parse-intake-notes/index.ts` (regex fallbacks + tightened empty-result guard).
- No schema changes. No UI changes.
- Edge functions redeploy automatically.
