# Fix Medical Information showing limited data (GAE intake parsing)

## Problem

For DONOTCONTACT TESTLEAD (Everest Vascular), the raw GHL intake notes contain the full GAE workup, but the parser stored mostly nulls. Result: the Medical Information card only shows Pathology, Duration, Pain Level, a garbled Symptoms value (`☑️ YES`), and a stray duration row.

Confirmed from DB:
- `oa_tkr_diagnosed`: null (raw note: "diagnosed with knee osteoarthritis: ☑️ YES")
- `trauma_related_onset`: null (raw note: "symptoms begin after a recent trauma/injury: ☑️ YES")
- `previous_treatments`: null (raw note: "Injections, Physical therapy, Knee replacement, Medications/pain pills")
- `age_range`: null (raw note: "How old are you?: 56 and above")
- `symptoms`: `☑️ YES` (wrong — should be "Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness")
- `affected_area`: null

## Root Cause

In `supabase/functions/auto-parse-intake-notes/index.ts` (the GHL STEP-field branch around lines 927–965):

1. **Symptoms overwritten** — the condition `key.includes('pain') || key.includes('frequency') || key.includes('symptom')` matches many GAE STEP 1/2 keys (anything containing the word "pain"), so the symptoms field gets clobbered by unrelated answers (the "knee osteoarthritis" Yes/No or trauma Yes/No ends up landing there). The actual "Describe the symptoms you're experiencing" field gets overwritten.
2. **OA/TKR diagnosis not captured** — no branch matches "diagnosed with knee osteoarthritis".
3. **Trauma onset not captured** — no branch matches "trauma" / "injury".
4. **Treatments rule too narrow** — `key.includes('treatment')` works but the Yes/No "knee replacement" answer can also leak in via the symptoms pain-match before reaching this branch.
5. **Age range too greedy** — `key.includes('age')` will also match "manage", "stage", etc. Should be tightened.

## Changes

### 1. `supabase/functions/auto-parse-intake-notes/index.ts`
Rework the STEP-field extractor (~lines 927–965) so each GAE question maps to the correct target field:

- **Symptoms**: only when key matches `describe the symptoms` / `symptoms you` / explicit `symptom` (not "pain")
- **Pain level**: key contains `scale` or `severe` + `pain`, extract digit
- **Duration**: key contains `how long` / `duration`
- **OA/TKR diagnosis**: key contains `osteoarthritis` or `tkr` or (`diagnosed` + `knee`) → set `oa_tkr_diagnosed` to YES/NO
- **Trauma onset**: key contains `trauma` or `injury` → set `trauma_related_onset` to YES/NO
- **Treatments**: key contains `treatment` or `tried`
- **Imaging**: keep existing (`x-ray`, `mri`, `imaging`)
- **Age range**: tighten to `how old` or `age range` / `age_range` (not bare `age`)
- Normalize `☑️ YES` / `☐ NO` checkbox values to `YES`/`NO`

Use `else if` chains so a single key only feeds one field.

### 2. Reparse the affected record
Invoke `reparse-specific-appointments` for appointment id `35a8fa25-c995-483c-b55c-55067c7d6748` so the Medical Information card immediately reflects the fix.

### 3. Optional sanity backfill
Run `bulk-parse-all-intake-notes` against Everest Vascular only, so other GAE records with the same parser gap get corrected. (Confirm with you before running broadly.)

## Out of scope
- UI changes — the previous fix (`procedure_type` gate) is already deployed and correct.
- Schema changes — only JSONB content is affected.

Approve to proceed with the parser fix and the targeted reparse for DONOTCONTACT TESTLEAD?