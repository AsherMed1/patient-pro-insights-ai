## Goal

Produce a fresh CSV (plus an Excel companion) listing every non-superseded appointment, across all projects, whose intake notes contain data that never made it into the parsed fields — i.e. records that are still fixable by a re-parse.

## What the data shows right now

Queried `all_appointments` (non-superseded, intake notes present and substantive):

- 24,110 records have usable intake notes.
- Gaps: insurance 6,424 · PCP/medical 10,819 · pathology 6 · DOB 4,278.
- Narrowing to **fixable** (the notes actually contain the missing item — an insurance/payer keyword, a PCP label, pathology markers, or a DOB label): **3,160 records**, of which 1,188 were created in the last 90 days and 351 in the last 30.

Pathology is essentially clean (6 records), so the batch is driven by insurance, PCP, and DOB gaps.

## Output

One row per appointment, columns:

Portal ID · Patient Name · Project · Appointment Date · Status · Date Created · Missing Insurance (Y/N) · Missing PCP/Medical (Y/N) · Missing Pathology (Y/N) · Missing DOB (Y/N) · Missing Count · Notes Length · Parse Attempts · Last Parsed At

Sorted by project, then most recent created date first.

Delivered as:

1. `missing_info_batch_2026-07-28.csv` — all 3,160 fixable rows
2. `missing_info_batch_2026-07-28.xlsx` — same data on a **Fixable Records** sheet, plus a **Summary by Project** sheet (rows per project, counts per missing category) and a **Recent 90 Days** sheet for triage priority

## Technical notes

- Pull via SQL against `all_appointments` in chunks (the read tool caps result size), then assemble with pandas/openpyxl.
- "Fixable" filter = field empty in both the top-level column and the `parsed_*` JSONB, AND the corresponding keyword pattern present in `patient_intake_notes`.
- Excludes `is_superseded = true` rows and records with fewer than ~80 characters of notes.
- Read-only — no app code, schema, or record changes.
