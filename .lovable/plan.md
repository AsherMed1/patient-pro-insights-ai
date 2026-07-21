## Goal
Rename the QA Operations error category **"Uploaded Insurance Card"** to **"Uploaded Insurance"** everywhere it appears, so the dropdown and existing case records stay consistent.

## Changes
1. **Seed migration update**  
   Update `supabase/migrations/20260721182025_26e26908-e292-49c1-8191-7825a890ef3e.sql` so the seeded value reads `('Uploaded Insurance', true)` instead of `('Uploaded Insurance Card', true)`. This keeps fresh deployments consistent.

2. **New data-migration**  
   Create a new Supabase migration that:
   - Updates `public.qa_error_categories.name` from `"Uploaded Insurance Card"` to `"Uploaded Insurance"`.
   - Updates `public.qa_cases.error_category` from `"Uploaded Insurance Card"` to `"Uploaded Insurance"` for all existing cases.
   - Updates the `qa_cases_error_category_check` constraint to allow `"Uploaded Insurance"` in place of `"Uploaded Insurance Card"`.

## Verification
- Run the migration against the project database.
- Open the QA Operations Queue, create or edit a case, and confirm the dropdown now shows **"Uploaded Insurance"**.
- Confirm existing cases previously categorized as "Uploaded Insurance Card" now display **"Uploaded Insurance"**.

## Notes
- No UI component changes are required; the dropdown already loads from `qa_error_categories`.
- This is a purely data/schema change.