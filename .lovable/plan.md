## Goal
Display the Neuropathy funnel answer "Which areas are most affected by your symptoms?" (e.g. "Both Feet and Hands") in the Medical Information card. Existing `affected_side` field only supports Left/Right/Both, which doesn't fit the Neuropathy question.

## Changes

### 1. Parser — `supabase/functions/auto-parse-intake-notes/index.ts`
- Add a new field `affected_areas: string | null` to `parsed_pathology_info` (alongside `affected_side`).
- Add extraction (both AI schema hint and regex fallback) for the line:
  `Neuropathy Step 2 | Which areas are most affected by your symptoms?: <value>`
  Captures free-text answers like "Both Feet and Hands", "Feet only", "Hands only", etc.
- Applies only when procedure is Neuropathy; leave `affected_side` untouched.

### 2. UI — `src/components/appointments/ParsedIntakeInfo.tsx`
- In the Medical Information card (where Pathology / Pain Level / Symptoms / Notes are displayed for Neuropathy), render a new row:
  `Affected Areas: Both Feet and Hands` when `parsed_pathology_info.affected_areas` is present.
- Make it editable via the existing pencil-edit pattern used for other pathology fields (writes back to `parsed_pathology_info.affected_areas`).

### 3. Backfill TPC Test (id `4ea1c1fd…`)
- Update the row to set `parsed_pathology_info.affected_areas = "Both Feet and Hands"` so the fix is immediately visible without re-running the parser.

## Out of scope
- No change to `affected_side` semantics or other procedures.
- No schema/migration changes — field lives inside the existing `parsed_pathology_info` JSONB.
