Add the two missing resolution types from the uploaded screenshot to the QA Operations Queue Resolution Type dropdown.

Current dropdown values: `Resolved by QA`, `Escalated to AM`, `Other`.
Requested values (per screenshot): `Resolved by QA`, `Escalated to Tech`, `Escalated to AM`, `Escalated to Gloria`, `Other`.

Changes required:
1. Database migration — update the `qa_cases_resolution_type_check` constraint on `public.qa_cases` to allow `'Escalated to Tech'` and `'Escalated to Gloria'`.
2. Frontend — update the `RESOLUTION_TYPES` constant in `src/components/admin/QAOperationsQueue.tsx` to include the two new options in the same order shown in the screenshot.

No data backfill is needed because the change only expands the allowed enum values.