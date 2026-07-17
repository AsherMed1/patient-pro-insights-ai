## Problem

On Georgia Endovascular PFE lead (Georgia Test, `6630f3ac`):
- `Pain Level: 3/10` — PFE intake has no pain scale question. The `3` was scraped from `Duration: 3-6 months`.
- `Primary Complaint: PAE / BPH` — this is a PFE lead; PAE isn't offered at Georgia Endovascular. The trigger fires on any casual `BPH` substring.

Primary complaint should reflect the patient's actual symptoms (e.g. "heel pain"), not the pathology label (PFE) and not a generic "PFE Consultation" placeholder.

## Fix

Edit only `supabase/functions/auto-parse-intake-notes/index.ts`.

1. **Tighten the PAE/BPH deterministic block trigger.** (Already applied.) Fire only when the intake contains `PAE w/BPH |` or `PAE STEP N |`, or when `procedure_type === 'PAE'`. Stops PFE / GAE / UFE leads from being tagged `PAE / BPH`.

2. **PFE-specific guard** (after GAE/ATE clamps):
   - If `procedure_type === 'PFE'` and the intake has no `scale of 1[-\s]to[-\s]10` pain question, force `pain_level = null`.
   - If `primary_complaint === 'PAE / BPH'` (leftover from a bad prior parse), clear it.
   - **Do NOT default to `'PFE Consultation'`** — redundant with the pathology label.

3. **Derive `primary_complaint` from patient symptoms for PFE.** When empty, try in order:
   - Regex on raw intake notes for the "chief complaint / primary complaint / what brings you in / reason for visit" answer.
   - Location-of-pain answers ("heel", "arch", "bottom of foot") → phrase as "<location> pain".
   - The `symptoms` field if it's a short human phrase (e.g. "heel pain", "sharp heel pain in the morning").
   
   If none produce a patient-specific phrase, leave `primary_complaint` `null` rather than inventing one. Apply the same "reflect actual symptoms, never fall back to `<Procedure> Consultation`" rule to the other symptom-driven procedures already using that placeholder (TAE / ATE / UFE / HAE) so behavior stays consistent — do not change PAE, which has a legitimate `PAE / BPH` diagnostic label.

4. **Backfill.** Null `parsing_completed_at` for Georgia Endovascular PFE rows so the auto-parse hook re-runs them. Verify `Georgia Test` and one or two siblings.

## Out of scope

- No UI changes.
- No schema changes.
- PAE extraction rules untouched.

## Verification

Re-query `parsed_pathology_info` for `6630f3ac-…` and confirm:
- `pain_level` is null.
- `primary_complaint` is either the patient's actual symptom phrase (e.g. "heel pain") or null — never `PAE / BPH`, never `PFE Consultation`.

Spot-check one real PAE lead to confirm `PAE / BPH` still lands there.
