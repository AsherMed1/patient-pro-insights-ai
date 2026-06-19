## Goals

1. Make the **Medical Information** card render the same rich layout for ATE that UFE uses today, but with ATE intake questions.
2. Fix the **Imaging Location** mis-mapping that currently produces `"Joint & Vascular Institute July"` instead of `"Joint & Vascular Institute"` (with `July 2025` going to Imaging When).

---

## 1. ATE Medical Information layout

Mirror the UFE block in `src/components/appointments/ParsedIntakeInfo.tsx` (lines ~880–908) with an ATE branch using ATE-specific GHL questions.

**ATE intake questions (from GHL Pathology Info):**
- `STEP 1 | How would you rate your pain on a scale of 0–10?` → `pain_level` (already rendered above)
- `STEP 1 | Where is your pain located?` → new field `pain_location`
- `STEP 2 | Have you tried any treatments for your Achilles pain? (Select all that apply)` → `previous_treatments` (rendered as a question-style row)

**UI rows added to the Medical Information card when `procedure_type === 'ATE'`:**
- Pathology: ATE *(existing)*
- Pain Level: X/10 *(existing)*
- Duration: ... *(existing generic row)*
- Primary Complaint: ATE Consultation *(existing)*
- **Where is your Achilles pain located?** → `pain_location`
- **Have you tried any treatments for your Achilles pain?** → `previous_treatments`
- Affected Area *(existing generic row, will show "Achilles tendon" once parsed)*
- Notes *(existing)*

No knee/UFE-specific rows render (already gated by procedure_type).

**Parser updates** in `supabase/functions/auto-parse-intake-notes/index.ts` ATE branch (~line 2376):
- Map `STEP 1 | Where is your pain located?` → `pathology_info.pain_location` (new) AND `pathology_info.affected_area` (so the existing Affected Area row also fills).
- Map `STEP 2 | Have you tried any treatments for your Achilles pain?` → `pathology_info.previous_treatments`.
- Keep `procedure_type = "ATE"`, `primary_complaint = "ATE Consultation"`.
- Reparse appointment `7ed90d97-214b-44b0-8168-837636e6f123` to backfill (set `parsing_completed_at = NULL`, invoke `auto-parse-intake-notes`).

---

## 2. Fix Imaging Location mis-mapping

**Root cause:** regex at `parseCompoundImagingResponse` (line 319):
```
/\b(?:at|from)\s+([A-Z][A-Za-z\s.&']+(?:Hospital|...|Institute)?[A-Za-z\s.&']*)/i
```
The trailing `[A-Za-z\s.&']*` after `Institute` keeps eating words, so `"at Joint & Vascular Institute July 2025"` captures `"Joint & Vascular Institute July"` for `imaging_location`.

**Fix:** post-process the captured location:
- Strip trailing month names (`January…December`) and 4-digit years.
- Trim trailing whitespace/punctuation again after the strip.

Result for the JVI Test record:
- `imaging_location` → `"Joint & Vascular Institute"`
- `imaging_when` → `"July 2025"` (already correct)
- `imaging_details` → `"yes X-ray at Joint & Vascular Institute July 2025"` (unchanged)

Apply the same trim to the AI-pathway `imaging_location` (line ~898 enrich block) so both code paths stay consistent.

After deploying, reparse the JVI Test appointment.

---

## Files changed

- `supabase/functions/auto-parse-intake-notes/index.ts` — ATE field mapping (`pain_location`, `previous_treatments`, `affected_area`); imaging_location trailing month/year strip.
- `src/components/appointments/ParsedIntakeInfo.tsx` — ATE-specific question rows in Medical Information card, parallel to UFE block.
- One-off: reparse JVI Test (`7ed90d97-214b-44b0-8168-837636e6f123`).

## Out of scope

- ATE Survey Fields custom card (slides 1, 6, etc.) — still blocked on slide-to-GHL mapping from Marissa.
