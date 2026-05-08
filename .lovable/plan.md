# Add TAE procedure support to intake parser

## Why

`DONOTCONTACT TESTLEAD` (id `6d1820be…`, Joint & Vascular Institute) parsed successfully but `parsed_pathology_info` is entirely null. GHL has 7 TAE pathology fields on the contact (TAE STEP 1/2 — thyroid nodule, surgery recommended, neck swelling, imaging done, cosmetic concerns, etc.), but the parser does not know what TAE is, so every TAE field is skipped.

Contact, demographics, insurance, and PCP name parsed correctly — only pathology is missing, and only because of unknown-procedure handling.

## Scope

Single file: `supabase/functions/auto-parse-intake-notes/index.ts`. Plus a one-off reparse of the affected lead.

## Changes

1. **`detectProcedureFromCalendar`** (~line 1478) — add a branch that returns `'TAE'` when the calendar name contains `TAE` or `thyroid`.

2. **`detectProcedureFromKey`** (~line 947) — add `if (upperKey.includes('TAE') || upperKey.includes('THYROID')) return 'TAE';` ahead of the generic branches so `TAE STEP 1 | …` keys bucket correctly and aren't filtered out by the wrong-procedure guard at ~line 1060.

3. **Fallback procedure detection** (~line 588) — add a TAE branch (`upperNotes.includes('TAE')` or `THYROID` or `THYROID NODULE`) to the if/else chain that sets `result.pathology_info.procedure_type`.

4. **TAE custom-field handling** in the GHL custom-field loop (~line 1229–1310, alongside PAD/FSE/HAE blocks). Map the known TAE STEP fields into `parsed_pathology_info`:
   - "diagnosed with a thyroid nodule or goiter" → `oa_tkr_diagnosed`-equivalent slot (reuse `primary_complaint = 'TAE Consultation'` and write the answer to `notes`/`symptoms` as we do for HAE)
   - "interested in avoiding surgery" → append to `notes`
   - "doctor recommended … Surgery" → `previous_treatments`
   - "experiencing any of the following … Lump or swelling in the neck" → `symptoms`
   - "open to a minimally invasive … treatment" → append to `notes`
   - "imaging of your thyroid" → `imaging_done`
   - "cosmetic concerns about your neck" → append to `symptoms`/`notes`
   Set `primary_complaint = 'TAE Consultation'`.

5. **Procedure-type label in `primary_complaint` regex** (~line 1207) — extend `/\b(pae|ufe|gae)\b/i` to include `tae`.

6. **Reparse the affected lead** by calling the existing `reparse-specific-appointments` edge function (or nullifying `parsing_completed_at` and letting the auto-parser re-run) for `id = 6d1820be-640b-46c4-8af2-0f9e767828e7`. Same approach used for the recent Premier Vascular backfill.

## Out of scope

- No UI changes — `ParsedIntakeInfo.tsx` already renders whatever lands in `parsed_pathology_info`.
- No new procedure-aware field-visibility tweaks (TAE just reuses the generic pathology section for now).
- No webhook changes — the issue is purely in the parser, not in `ghl-webhook-handler`.
- Other null fields on this record (gender, age, pcp_phone, imaging) are not parser bugs — they are absent from the GHL contact.

## Verification

After deploy + reparse:
- `parsed_pathology_info.procedure_type = 'TAE'`
- `parsed_pathology_info.primary_complaint = 'TAE Consultation'`
- `symptoms`, `imaging_done`, `previous_treatments`, `notes` populated from the TAE STEP answers
- Patient Pro Insights panel for this lead shows the TAE pathology block instead of an empty section.
