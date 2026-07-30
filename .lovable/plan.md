## What's wrong

Samara Valle (`6c824802`, Ally Vascular and Pain Centers, Neuropathy, Aug 4) has complete raw intake notes in the portal — insurance (Tri-Care, University Health CARELINK, ID 71556634), PCP (Dr. Ladapo MD, 210-358-5100), and full Neuropathy pathology (pain 10, both feet and hands, symptoms list, diabetes YES).

But the parsed cards are empty:
- `parsed_insurance_info` = `{}`
- `parsed_medical_info` = `{}`
- `parsed_pathology_info` = only `{procedure_type: "Neuropathy"}`

Contact and demographics parsed fine, and the parse is marked complete (17:10 today), so the parse run returned partial/empty results rather than never running.

This is not systemic: of 58 recent Ally Neuropathy records, only 1 has empty insurance and 4 have empty medical info — so it's a one-off failure of that parse run, not a broken rule.

## Fix

1. Re-run `trigger-reparse` for Samara Valle after clearing `parsing_completed_at` so the parser re-processes from scratch.
2. Verify the resulting `parsed_insurance_info`, `parsed_medical_info`, and `parsed_pathology_info` against the raw notes above; if any field is still missed, patch it directly so the portal card is complete.
3. Re-parse the 4 sibling Ally Neuropathy records with empty `parsed_medical_info` in the same pass, then re-check them.
4. No parser code changes unless step 2 shows a label the regex/AI genuinely cannot read (e.g. the "Neuropathy insurance provider:" prefix or the curly-apostrophe "Primary Care Doctor's Name") — in that case add the matching fallback pattern in `auto-parse-intake-notes`.

## Technical notes

- Records are identified by `id`; no schema changes.
- Direct field patching (if needed) updates the `parsed_*` JSONB objects together with any corresponding top-level columns, per the existing data-integrity rule.
- Re-parsing does not alter status, review status, or appointment dates.
