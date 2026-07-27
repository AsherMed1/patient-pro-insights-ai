## What's wrong

Reginald Peterson (Vascular Surgery Associates, GAE, Aug 6 2026, record `7df804ee`) shows blank Insurance, Medical/PCP and Pathology cards even though his intake notes contain everything:

- Insurance: Medicare, Plan "Medicare Part A and B", ID `7V99-K47-TN20`, note about Aetna supplemental (card not received)
- PCP: Phillip Neubauer, 410-539-2227
- GAE STEP data: both knees, over 1 year, OA diagnosed YES, imaging YES (two x-rays July 24), pain 8/10, no trauma, treatments Injections + Supplements, full symptom list

Confirmed in the database: `parsed_insurance_info`, `parsed_medical_info` and `parsed_pathology_info` are all-null skeletons, `parsing_completed_at` was stamped 4 seconds after creation, and `parse_attempts` is 0.

## Why the safety net didn't catch it

The empty-parse guard added earlier only blocks the "parsed" stamp when insurance **and** medical **and** pathology are all empty. Pathology here is not technically empty — it carries `procedure_type: "GAE"`, which the calendar-name override always sets regardless of whether anything was actually parsed. So the record looked "partially parsed", got stamped complete, and never became eligible for the self-healing sweep.

The underlying parse produced nothing (likely an AI call that returned nulls); the deterministic regex fill did not rescue it.

## Fix

1. **Repair the record.** Reset `parsing_completed_at` to null on Reginald's row and re-run the parser for that single record, then verify the three cards populate from the notes above. If the re-run still comes back empty, write the values in directly from the notes (insurance provider/plan/ID/notes, PCP name + phone, and the GAE pathology set including affected side "Both", imaging details, pain level, treatments, symptoms).

2. **Close the guard gap** in `supabase/functions/auto-parse-intake-notes/index.ts`: when judging whether the pathology payload is empty, ignore `procedure_type` (and any other calendar-derived-only key). A pathology object whose sole content is the calendar-derived procedure counts as empty, so records like this one are left unstamped and picked up by the retry sweep instead of silently landing blank in the portal.

3. **Find the siblings.** Re-run the "empty parse" audit query with the corrected emptiness rule to see how many other records were stamped complete while holding only `procedure_type`. Report the count and list before touching anything — no bulk re-parse without your go-ahead, same as with the 86-record list.

## Technical detail

- Guard location: the `Empty-parse guard` block near the end of the per-record loop in `auto-parse-intake-notes/index.ts`; also mirror the same "ignore procedure_type" rule in the earlier `isEmptyObj` check that decides whether to merge regex pathology into an empty AI pathology result.
- No schema changes. Behaviour change is limited to whether `parsing_completed_at` gets stamped — nothing already-populated can be blanked, since all writes stay non-null merges.
