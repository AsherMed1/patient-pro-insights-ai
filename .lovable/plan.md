## Problem

TEH Test (`df258529…`, Texas Endovascular, PFE) still shows `Primary Complaint: PFE Consultation` despite the PFE guard I added last turn. DB confirms: `procedure_type: PFE`, `primary_complaint: PFE Consultation`, `parsing_completed_at: 2026-07-17 22:20:07` (already re-parsed once).

## Why it slipped through

Two mechanisms in `auto-parse-intake-notes/index.ts` write `"PFE Consultation"` into `parsedData` during a run:

1. `extractDataFromGHLFields` (line ~2144): any GHL custom field whose key matches `prefer|procedure|treatment|surgical` and contains a `pfe` token → sets `primary_complaint = "PFE Consultation"`. GHL fields for Texas Endovascular PFE calendars trigger this.
2. Same function line ~2381: catch-all where any GHL field key containing `consultation`/`appointment`/`service` copies its value into `primary_complaint`. A GHL field literally named/valued "PFE Consultation" lands here.

The PFE sanity guard in `enrichWithCriticalFields` (line ~1631) is supposed to null out `"PFE Consultation"` afterward. It runs at line 2930 — after the GHL merge and calendar override — so it *should* fire. The fact that this record was reparsed at 22:20 today with the guard code and still ended up wrong means either (a) the run at 22:20 used a pre-guard edge-function build, or (b) the guard branch isn't executing on this record. Either way, the same-shape placeholder is still being *produced* upstream on every fresh run, so the fix should stop producing it at the source, not only clean it up after the fact.

## Fix

Edit only `supabase/functions/auto-parse-intake-notes/index.ts`.

1. **Stop generating `"<PROC> Consultation"` placeholders at the source in `extractDataFromGHLFields`.** For the symptom-driven procedures (PFE, GAE, UFE, HAE, TAE, ATE, FSE, PAD) do not write `primary_complaint` from a bare procedure-type key or from generic "consultation"/"appointment"/"service" catch-alls. Concretely:
   - Line ~2138–2152 ("prefer / non-surgical / treatment / procedure / surgical" branch): drop the `procedureMatch → "<PROC> Consultation"` assignment for symptom-driven procedures. Still capture the raw value into `symptoms`. Leave PAE alone (it has a real diagnostic label `PAE / BPH` handled elsewhere).
   - Line ~2153–2163 (`pae/ufe/gae` branches): keep `affected_area` writes; remove the `"<PROC> Consultation"` assignments for UFE and GAE. PAE stays as-is because the deterministic PAE block sets `PAE / BPH` as its real complaint.
   - Line ~2222 (TAE branch): same treatment — remove `"TAE Consultation"` seed; the TAE deterministic guard at line ~1381 can still fall back only when everything else fails, but per the "actual symptoms, never `<Procedure> Consultation`" rule from last turn's plan, we drop that too.
   - Line ~1381 (TAE guard) and line ~1803 (ATE guard) inside `enrichWithCriticalFields`: remove the `"TAE Consultation"` / `"ATE Consultation"` fallbacks. If we can't derive a symptom phrase, leave `primary_complaint` null.
   - Line ~2380–2385 catch-all (`consultation|appointment|service`): tighten so it only fires when the value looks like a patient symptom phrase (short, not equal to `"<PROC> Consultation"`, not equal to the procedure_type). Simplest: skip entirely if `value` matches `/^\s*(PAE|PFE|UFE|GAE|HAE|TAE|ATE|FSE|PAD)\s+Consultation\s*$/i`.

2. **Broaden the sanity guard to be procedure-agnostic.** In `enrichWithCriticalFields`, after the existing per-procedure blocks, add a final pass: if `primary_complaint` matches `/^(PAE|PFE|UFE|GAE|HAE|TAE|ATE|FSE|PAD)\s+Consultation$/i` **and** it's not the legitimate `PAE / BPH` case, null it and re-run the same "derive from chief complaint / location-of-pain / short symptom phrase" logic already used for PFE (extract the helper so PFE, GAE, UFE, HAE, TAE, ATE, FSE, PAD all share it). Leave null if nothing derives. This is a safety net in case a new GHL field path is added later.

3. **Backfill.** Null `parsing_completed_at` for rows where `parsed_pathology_info->>'primary_complaint'` matches `^(PAE|PFE|UFE|GAE|HAE|TAE|ATE|FSE|PAD)\s+Consultation$` (excluding legitimate PAE / BPH). The auto-parse client hook re-runs them within 30s. Spot-check TEH Test (`df258529…`) after re-parse: expect `primary_complaint` to be either derived symptom text or `null`, and `procedure_type` to remain `PFE`.

## Out of scope

- No UI changes.
- No schema changes.
- PAE `PAE / BPH` labeling and Neuropathy handling untouched.

## Verification

Re-query `parsed_pathology_info` for `df258529…`:
- `procedure_type` = `PFE`
- `primary_complaint` is `null` (TEH Test has no chief-complaint or location-of-pain answer and null symptoms) — never `PFE Consultation`.

Spot-check one real PAE lead: `primary_complaint` still `PAE / BPH`. Spot-check one recently-parsed UFE / GAE lead: `primary_complaint` reflects patient symptoms or null, never `UFE Consultation` / `GAE Consultation`.
