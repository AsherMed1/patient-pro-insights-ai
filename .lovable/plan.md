# Fix "Add plan" doing nothing on Insurance Rules

## What's wrong

The insurance-rules tables were created without database access grants. Checking the database:

- `insurance_canonical_plans`, `insurance_plan_aliases`, `insurance_block_rules`, `insurance_block_rule_scopes`, and `clinic_supported_insurances` have **zero** privilege grants for the app's roles.
- Row-level security policies exist and are correct (admin/agent can manage, signed-in users can read), but policies alone are not enough — without grants every read and write is rejected before RLS is even consulted.

That is why the list always says "No canonical plans configured yet" and why clicking **Add plan** appears to do nothing.

## The fix

One database migration granting the missing access:

- `SELECT, INSERT, UPDATE, DELETE` to signed-in users on all five tables (RLS still restricts management to admin/agent).
- Full access to the service role, so the GHL sync function and the OON evaluator keep working.

No `anon` access — these are admin-only configuration tables.

## Also worth doing

The Add plan handler already surfaces database errors as a red toast, but a permission failure here was silent in practice. After the grants land I'll re-test adding a canonical plan, an alias, and a block rule in the preview to confirm each one saves and reappears in the list.
