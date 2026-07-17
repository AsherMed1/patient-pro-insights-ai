## Problem

On Georgia Endovascular PFE lead (Georgia Test, `6630f3ac`), the Medical Information card shows:
- `Pain Level: 3/10` — PFE intake has no pain scale question. The `3` was scraped from `Duration: 3-6 months`.
- `Primary Complaint: PAE / BPH` — this is a PFE lead; PAE is not offered at Georgia Endovascular.

## Root cause (verified against the record)

In `supabase/functions/auto-parse-intake-notes/index.ts`:

**Primary complaint bleed (line ~1573):**
```ts
if (/PAE w\/?\s*BPH\s*\||prostate|BPH/i.test(intakeNotes)) {
  if (!parsedData.pathology_info.primary_complaint) {
    parsedData.pathology_info.primary_complaint = 'PAE / BPH';
  }
  ...
}
```
The trigger fires on any casual occurrence of the substring `BPH` anywhere in the intake blob (confirmed: the PFE record contains a stray `Bph` token). It should only fire for real PAE intakes.

**Pain level bleed:** PFE intake has no "scale of 1–10" question, so the deterministic PFE branch never sets `pain_level`. The `3` is coming from the AI parser lifting the leading digit of `3-6 months`, and no PFE-specific guard clears it. Other procedures (GAE, ATE) already clamp / clear invalid `pain_level` values.

## Fix

Edit only `supabase/functions/auto-parse-intake-notes/index.ts`.

1. **Tighten the PAE/BPH deterministic block trigger.** Replace the loose `BPH|prostate` substring test with a structural test: fire only when the intake contains `PAE w/BPH |` or `PAE STEP N |`, OR when `parsedData.pathology_info.procedure_type` is already `PAE`. This prevents PFE / GAE / UFE leads from being tagged `PAE / BPH`.

2. **Add a PFE pain-level guard** (mirror the existing GAE/ATE clamps): after enrichment, if `procedure_type === 'PFE'` and the intake notes contain no `scale of 1[-\s]to[-\s]10` pain question, force `pain_level = null`. Also drop any AI-provided `primary_complaint` equal to `'PAE / BPH'` when procedure is PFE, and default it to `'PFE Consultation'` when empty (matching the pattern used for TAE/ATE/UFE).

3. **Backfill the affected records.** Re-run the parser (or a targeted SQL update) for existing Georgia Endovascular PFE rows so `Georgia Test` and any siblings display correctly. Verify with a follow-up read query.

## Out of scope

- No UI changes — `ParsedIntakeInfo.tsx` already renders whatever the parser stores.
- No schema or migration changes.
- Other procedures' extraction rules are left untouched.

## Verification

After the edit and backfill, re-query `parsed_pathology_info` for `6630f3ac-…` and confirm `pain_level` is null and `primary_complaint` is not `PAE / BPH`. Spot-check one PAE lead (e.g., Steven Dabbs) to confirm PAE behavior is unchanged.