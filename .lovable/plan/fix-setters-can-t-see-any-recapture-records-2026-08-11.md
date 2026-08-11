# Fix: setters can't see any Recapture records

## What's happening

Anyira has the `review_only` (setter) role and the Recapture list correctly loads for her — it just returns zero rows.

Confirmed by inspection:
- Anyira's account: role `review_only`, and **zero** project assignments.
- The Recapture table's read rule for setters requires the role **and** an explicit project assignment matching the case's clinic.
- The Review Queue's read rule for `review_only` requires only the role — no project assignment.
- There are 2,853 recapture cases in the system, so the list isn't empty; it's filtered to nothing for her.

So setters see the Review Queue (22 items) but an empty Recapture list purely because Recapture is project-scoped and no projects are assigned to them.

## Fix

Align Recapture access with the Review Queue: a setter (`review_only` or `recapture` role) sees all recapture cases across clinics, matching how they already see all appointments awaiting review.

- Replace the setter read rule on recapture cases so it checks role only.
- Do the same for the setter update rule, so they can log outreach and change case status on any case they can see.
- Leave admin/agent/VA access unchanged.

## Alternative if you'd rather keep it scoped

If Recapture is meant to stay clinic-scoped, the fix is data instead of policy: assign the relevant clinics to each setter in User Management. Say the word and I'll do that instead — but note the Review Queue would still be unscoped, so the two lists would behave differently.

## Technical notes

- Migration on `public.recapture_cases`: drop and recreate `recapture_cases_setter_select` and `recapture_cases_setter_update` with `has_role(auth.uid(),'review_only') OR has_role(auth.uid(),'recapture')`, dropping the `project_user_access` EXISTS clause.
- No frontend changes needed — `RecaptureQueue.tsx` already queries the table directly and will populate once rows are readable.
- Verify afterwards by counting readable rows as Anyira's user.
