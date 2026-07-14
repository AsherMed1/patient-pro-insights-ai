## Problem

Sue Brown (Ozark) has "Which side is affected by the condition you are seeking treatment for?: Both" in her intake notes, but the Medical Information Card shows no Affected Side. Investigation:

- The deterministic regex that populates `parsed_pathology_info.affected_side` already exists in `auto-parse-intake-notes` (line ~1548) and works correctly for GAE/PFE/FSE/PAD/ATE/NEUROPATHY.
- Sue Brown's row was parsed on **2026-07-09**, before that enrichment block was deployed. Her `procedure_type=GAE` but `affected_side=null`.
- This isn't Ozark-specific. Querying the DB, **~65 records across 27 projects** have "which side is affected" in intake notes but a null `affected_side` — all are stale parses.

## Fix

One-time SQL backfill that re-runs the same regex logic on existing rows, in a single UPDATE — no re-parse, no AI cost.

For every `all_appointments` row where:
- `patient_intake_notes` matches `which side is affected`, AND
- `parsed_pathology_info->>'affected_side'` is null/empty, AND
- `parsed_pathology_info->>'procedure_type'` ∈ (GAE, PFE, FSE, PAD, ATE, NEUROPATHY)

extract the captured value with `regexp_match(notes, 'which side is affected[^:?\n]*\??:\s*([^\n]+)', 'i')`, map it to Left/Right/Both using the same rules as the edge function (bilateral→Both, then left, then right), and `jsonb_set` it into `parsed_pathology_info.affected_side`.

## Verification

- Re-check Sue Brown → `affected_side` = "Both", UI shows "Affected Side: Both".
- Re-run the audit query and confirm the 65-row backlog drops to 0 (rows whose free-text answer doesn't cleanly map to Left/Right/Both will remain null, which is correct).

No code changes — the live parser already handles new rows. Only a data backfill.
