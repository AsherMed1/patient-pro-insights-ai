## Scope
Safely clean up the 6 Premier Vascular records with corrupted parsed data — same category of issue Jovita had. No parser code changes (the hardening from last turn already prevents recurrence). Manual JSONB patch only, mirroring the exact approach used on Jovita.

## Records to fix

Symptoms were mis-parsed as the trauma Yes/No answer instead of the real symptom list. Correct values are pulled directly from each record's raw `patient_intake_notes` line `GAE STEP 2 | Describe the symptoms you're experiencing.: ...`.

| ID | Patient | Current symptoms | Correct symptoms (from raw notes) |
|---|---|---|---|
| 9e57314b… | Janice Fambro | ❌ NO | (from notes) |
| bfc968d6… | Delois Peal | ❌ NO | (from notes) |
| a4248ced… | Sam Oni | ❌ NO | (from notes) |
| 18a53041… | Cassius Dudley | ☑️ YES | Instability or weakness, Grinding sensation, Stiffness, Swelling, Sharp Pain, Dull Ache |
| d2c704da… | Jeanette Scarboro | ☑️ YES | (from notes) |

Plus one non-GAE record with an invalid pain level:

| ID | Patient | Issue | Fix |
|---|---|---|---|
| 0cd13f25… | Emma Rozier (PFE) | pain_level = 19 (PFE has no 0–10 pain scale) | set pain_level = null |

## How

For each row, one targeted SQL UPDATE on `all_appointments`:
- Only mutate `parsed_pathology_info->'symptoms'` (or `pain_level` for Emma) via `jsonb_set`.
- Read the correct value from that same row's `patient_intake_notes` (fixed line pattern), so we never guess.
- Bump `updated_at`.
- No touching of top-level columns (DOB, phone, email, dates, status, IPC, EMR queue).
- No parser re-run, no `parsing_completed_at` reset, no GHL fetch.

## Safety
- 6 rows, scoped by explicit `id =` clauses.
- Worst case if a raw-notes line is missing: we set that record's symptoms to null (blank is safer than misleading garbage) — same rule the hardened parser now uses.
- No migration, no schema change, no other records touched.
- Verified after: re-query the 6 IDs and confirm `symptoms` / `pain_level` look correct.

## Not in this plan
- No changes to any other Premier record.
- No changes to any other project.
- No parser code changes (already done last turn).
- No re-parse of these records — manual value only, matches how Jovita was fixed.
