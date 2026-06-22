## Diagnosis

Pulled the Alliance Vascular lead (`Alliance Test`, id `1d40aae7…`) and compared raw GHL intake notes vs `parsed_*` columns:

| Issue in screenshot | Reality in DB now | Root cause |
|---|---|---|
| 1. No insurance | `parsed_insurance_info` correctly has Medicare / Medicare / `huh788xu8uxx` + insurance card link | Screenshot taken **before** auto-parse completed. Extraction itself works. |
| 2. Medical Info shows only "Pathology: PAE" | `parsed_pathology_info` now has `procedure_type: GAE` plus all GAE STEP fields | Same — pre-parse snapshot. Once parsing finishes, GAE rows render. |
| 3. Imaging Location: "Alliance Vascular **in**" | Real parser bug | `parseCompoundImagingResponse` regex (`supabase/functions/auto-parse-intake-notes/index.ts` ~line 319) captures `at Alliance Vascular in August`, strips `August/2025`, leaves dangling `in`. |

#1 and #2 are timing artifacts — no code change needed. **#3 is a real parser bug** affecting any AI-generated phrasing like "at <Facility> in <Month> <Year>" or "at <Facility> on <date>".

## Code Fix (issue #3 only)

Edit `parseCompoundImagingResponse` in `supabase/functions/auto-parse-intake-notes/index.ts`:

1. Tighten the capture so it stops before connective prepositions followed by date words:
   ```ts
   const locationMatch = value.match(
     /\b(?:at|from)\s+([A-Z][A-Za-z\s.&']+?)(?=\s+(?:in|on|during|around|near)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})|\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|\s+\d{4}|[,.;]|$)/i
   );
   ```
2. Belt-and-suspenders cleanup after the existing month/year strip:
   ```ts
   location = location.replace(/\s+(in|on|at|by|during|around|near)\s*$/i, '').trim();
   ```
3. Discard if the cleaned result is empty, a stop-word alone, or under 3 chars.

## What I will NOT change

- No data backfill — existing rows stay as-is per your instruction.
- Insurance extraction (already correct).
- Pathology/GAE rendering (already correct).
- Auto-parse trigger timing.

## Files touched

- `supabase/functions/auto-parse-intake-notes/index.ts` — ~10 line regex fix, no migration.