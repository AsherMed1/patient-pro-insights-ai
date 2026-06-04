## Problem

The Painless Center's "Request Your Neuropathy Consultation at ..." calendars produce appointments whose `parsed_pathology_info.procedure_type` is `GAE` (and pull GAE-specific intake fields like `oa_tkr_diagnosed`, "knee" symptoms, etc.). The auto-parser has no Neuropathy branch — it falls back to keyword matching ("GAE"/"KNEE" in notes) and incorrectly tags these patients as GAE. A stale rule also coerces Neuropathy STEP fields into the GAE bucket.

## Fix

### 1. Calendar detection — recognize Neuropathy
`supabase/functions/auto-parse-intake-notes/index.ts` → `detectProcedureFromCalendar()` (line ~1871). Add a branch above the GAE one:
```ts
if (name.includes('neuropathy') || name.includes('neuro')) {
  return 'Neuropathy';
}
```
Order matters — must be checked before `gae`/`knee` so it can't fall through.

### 2. STEP-line stripping — stop merging Neuropathy into GAE
Same file, lines 52–67 (`stepRe` + the `linePrefix === 'NEUROPATHY' && proc === 'GAE'` exception). Remove the exception so Neuropathy STEP lines are kept only when `proc === 'Neuropathy'`, and drop the misleading "Treat Neuropathy as belonging to GAE workflow only" comment.

### 3. Keyword fallback — add Neuropathy
Same file, lines 730–745 (procedure detection on raw notes). Add a `neuropathy` keyword branch that sets `procedure_type = 'Neuropathy'`. Place it before the GAE/knee check so Neuropathy notes don't fall through (knee numbness symptoms are common in Neuropathy intakes).

### 4. AI prompt — let the model emit Neuropathy
Same file, around line 2196 (prompt template referencing `calendarProcedure`) and any enum list of valid procedure types. Add `Neuropathy` to the allowed `procedure_type` values so the model returns it for Painless Center Neuropathy calendars.

### 5. GHL custom-field procedure filter
Same file, `detectProcedureFromFieldKey()` (line ~1310) and the Service Name override regex (line ~809). Add `NEUROPATHY` so the per-procedure field filter works for Neuropathy STEP fields.

### 6. UI surface
- `parsed_pathology_info.procedure_type === 'Neuropathy'` already maps to Emerald per the calendar color memory. Verify the pathology card/tag renders the `Neuropathy` label and hides GAE-only fields (OA/TKR Diagnosed, knee imaging, treatments tried for knee). Reuse the existing procedure-specific field-visibility pattern (see memory: Procedure Field Visibility).
- Procedure tag dropdown / filter chips: add `Neuropathy` to the canonical list wherever GAE/PAE/etc. are enumerated.

### 7. Re-parse existing rows
For every `all_appointments` row where:
- `project_name = 'The Painless Center'`
- `calendar_name ILIKE '%Neuropathy%'`

Clear `parsed_insurance_info`, `parsed_pathology_info`, `parsed_contact_info`, `parsed_demographics`, `parsing_completed_at` (one UPDATE), then invoke `reparse-specific-appointments` for those IDs in batches so the new calendar-aware parser repopulates them with `procedure_type = 'Neuropathy'`.

## Memory updates after build

- Add a new memory `mem://domain/procedure-definition-neuropathy` describing Neuropathy as a standalone procedure at The Painless Center (calendar keyword `Neuropathy`, pathology focuses on numbness/cold feet, no OA/TKR).
- Update the existing "Treat Neuropathy as belonging to GAE workflow only" note (currently encoded in code comments and implied in [VSNC Virtual Location]) so future agents don't reintroduce the merge.

## Out of scope

No schema changes — `procedure_type` is a free-text JSON field. No GHL outbound changes.