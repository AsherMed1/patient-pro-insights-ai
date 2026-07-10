## Problem

VSAV Test lead has "GAE STEP 1 | Which side is affected by the condition you are seeking treatment for?: Both" in the intake notes, but `parsed_pathology_info.affected_side` is `null`, so the Medical Information card doesn't display it.

The AI parser missed it, and the deterministic GHL-key branch that handles "which side / affected" (`auto-parse-intake-notes/index.ts:1908`) only runs on structured GHL contact custom fields — not on the raw STEP-formatted intake notes text where the answer lives. None of the STEP regex enrichment blocks extract affected side.

## Fix

Add a deterministic regex enrichment for `affected_side` in `supabase/functions/auto-parse-intake-notes/index.ts`, scoped to procedures that actually have a laterality question: **GAE, PFE, FSE, PAD, ATE, Neuropathy**.

Logic:
- Detect current procedure via `parsedData.pathology_info.procedure_type` (uppercased). If not in the allowlist above, skip.
- Regex against raw `intakeNotes`: `/which side is affected[^:?\n]*\??:\s*([^\n]+)/i`.
- Normalize captured value: `both`/`bilateral` → `Both`, `left` → `Left`, `right` → `Right`.
- Only overwrite when current `affected_side` is null/empty.
- For GAE: when `affected_knee` is empty, mirror the value into `affected_knee` so the existing GAE knee badge lights up.
- Log the extraction like the other enrichment branches.

After deploy, invoke `reparse-specific-appointments` for VSAV Test (`c0fb9d82-f910-42e2-9e33-25aa10c2b320`) so the existing record picks up the value.

No UI changes needed — `ParsedIntakeInfo.tsx` already renders `parsedPathologyInfo.affected_side` (line 1038).
