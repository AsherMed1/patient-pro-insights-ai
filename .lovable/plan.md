## Problem

Rana Asif's **Medical Information / Pathology** card is empty even though the GHL intake notes contain rich Neuropathy answers (pain level 7, feet affected, diabetes yes, symptoms >3 months, etc.). Only `procedure_type: Neuropathy` was captured — every other pathology field is null. The `parsed_medical_info` card (PCP, allergies, medications, imaging) is also fully null.

The current pipeline relies entirely on the AI parser for these fields. When the AI parse partially fails (as it did for the insurance card previously), pathology/medical fields are silently left null. This mirrors the insurance issue you just had me fix.

## Plan

**1. Backfill Rana Asif** with the values clearly present in his intake notes:
- `pain_level`: 7
- `affected_areas` / `affected_area`: Feet only
- `duration`: More than 3 months
- `symptoms`: Numbness or tingling in feet or hands
- `previous_treatments`: None tried
- Diabetes flag: Yes (add to pathology info)

**2. Harden `ghl-webhook-handler`** — same non-AI extraction pattern already added for insurance. Read the pathology STEP fields directly from GHL custom fields on ingest and write them into `parsed_pathology_info` so data lands even if the AI parser fails or is slow. Cover Neuropathy STEP fields (pain level, affected areas, duration, symptoms, diabetes, ability-to-walk, previous treatments) since The Painless Center is the primary Neuropathy source.

**3. Harden `auto-parse-intake-notes`** — apply the same non-null merge guard already in place for insurance/medical to `parsed_pathology_info`, so a subsequent AI run that returns null for a field never wipes a previously-captured value.

**4. Also backfill `parsed_medical_info`** where notes contain values (Rana's intake doesn't list PCP/allergies/meds/imaging, so this stays null for him — no action needed beyond the merge guard above).

### Technical notes
- Files: `supabase/functions/ghl-webhook-handler/index.ts`, `supabase/functions/auto-parse-intake-notes/index.ts`.
- Backfill via `supabase--insert` on `all_appointments` for id `ea90030f-0561-46a4-b9c3-348612be4d41`.
- No schema changes; `parsed_pathology_info` already exists as JSONB.
- No UI changes — `ParsedIntakeInfo.tsx` already renders `pain_level`, `symptoms`, `affected_areas`, `duration`, etc.
