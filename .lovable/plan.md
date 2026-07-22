## Problem

Saving audit details with **Error Category = "Missing Address"** fails because the DB check constraint `qa_cases_error_category_check` only allows:

`Missing Insurance, Notes Added to Portal, Duplicate Appointment, Booking Rule Violation, Uploaded Insurance, Name Correction, Double Booked, Incorrect Patient Info, Other`

The UI's Error Category field is dynamic (users can add new categories via `ErrorCategoryField`), but the DB constraint is a static allowlist — so any newly added category (like "Missing Address") is rejected.

## Fix

Single migration on `qa_cases`:

1. Drop `qa_cases_error_category_check`.
2. Re-create it to also permit `'Missing Address'`, keeping all existing values so nothing else regresses:
   `Missing Insurance, Missing Address, Notes Added to Portal, Duplicate Appointment, Booking Rule Violation, Uploaded Insurance, Name Correction, Double Booked, Incorrect Patient Info, Other`.

No code changes — the UI already sends the value correctly; the constraint is the sole blocker.

## Note on future categories

The QA team can add categories through the UI dropdown but the DB constraint is a static allowlist, so any brand-new label will hit this same error. If you want I can, in a follow-up, drop the check entirely and rely on the UI-managed list — say the word and I'll include it. For now this plan just unblocks "Missing Address".
