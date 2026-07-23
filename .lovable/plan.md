## Problem

Saving audit details fails with:
`new row for relation "qa_cases" violates check constraint "qa_cases_error_category_check"`

The `error_category` dropdown is populated from an **editable master list** (`qa_error_categories` table), but the `qa_cases.error_category` column still has a hardcoded `CHECK` constraint that only permits 10 fixed values (Missing Insurance, Missing Address, Notes Added to Portal, Duplicate Appointment, Booking Rule Violation, Uploaded Insurance, Name Correction, Double Booked, Incorrect Patient Info, Other).

"OON / Setter" (and any other category admins add via the master list) will always be rejected. This is a design mismatch — the check constraint contradicts the "editable master list" model.

## Fix

Drop the `qa_cases_error_category_check` constraint entirely. The master `qa_error_categories` table is the source of truth for allowed values; the UI already picks from it, so a hardcoded DB whitelist is redundant and blocks legitimate new categories.

### Migration
```sql
ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_error_category_check;
```

No UI or code changes needed — the dropdown, save flow, and master-list editor already work correctly.

## Verification

After the migration, saving the audit details for the pictured case (Error Category = "OON / Setter") will succeed, and admins can freely add new categories via the master list without hitting constraint errors.