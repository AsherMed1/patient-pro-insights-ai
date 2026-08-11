# Remove duplicated lines in the Medical Information card

## What's happening

For "Elite Test" (Elite Minimally Invasive Specialists), the stored record has the same text in two fields:

```text
Symptoms:          Feeling like your bladder doesn't fully empty, Dribbling or difficulty starting urination
Primary Complaint: Feeling like your bladder doesn't fully empty, Dribbling or difficulty starting urination
```

So the card prints the same sentence twice. This is not unique to this clinic: 376 of 10,455 records with both fields have an identical Symptoms and Primary Complaint value.

## Fix

1. **Display layer** (`ParsedIntakeInfo.tsx`, Medical Information card): hide the "Primary Complaint" line when its text is the same as "Symptoms" after normalizing (case, punctuation, whitespace, and separator order for comma-joined lists). Also hide it when it is fully contained in the Symptoms list. If Primary Complaint carries something genuinely different, it still shows.

2. **Same dedupe for the other repeatable pairs** in the same card, using one shared helper so it applies consistently: Symptoms vs Other, Primary Complaint vs Other, Treatments Tried vs Other. Any fact already shown above is dropped from the later line; if nothing survives, the line is hidden entirely (same behavior as today's "Other" filter).

3. **Parser** (`auto-parse-intake-notes`): instruct the model to leave `primary_complaint` empty when it would just restate `symptoms`, and add a post-parse guard that clears `primary_complaint` when it matches `symptoms` — so newly parsed records are stored clean, not just displayed clean.

No schema or data migration: existing records display correctly immediately, and re-parses will clean the stored values over time.

## Technical notes

- File: `src/components/appointments/ParsedIntakeInfo.tsx` — the Medical Information card block (~lines 1282-1339). Extract the existing per-fact split/clean logic from the `other_notes` renderer into a small local helper (`splitFacts`, `normalizeFact`) and reuse it for the dedupe checks.
- File: `supabase/functions/auto-parse-intake-notes/index.ts` — prompt line for `primary_complaint` plus a pre-save equality check.
- Verify against Elite Test: card should show Symptoms and Other, with no repeated Primary Complaint line.
