# Remove the reconciliation sweep, keep real-time webhook only

Correct — the sweep was new (added earlier today). It did not exist before; before that, the Portal relied solely on the real-time `ghl-webhook-handler`. Rolling it back returns the Review Queue to exactly the prior behavior.

## Changes

1. **Unschedule the cron job**
   Remove the `reconcile-ghl-appointments-every-15-minutes` pg_cron job so no further automatic sweeps run.

2. **Remove the Edge Function**
   Delete `supabase/functions/reconcile-ghl-appointments/index.ts` and undeploy the function so it cannot be triggered on demand or externally.

3. **Leave everything else untouched**
   - `ghl-webhook-handler` is unchanged and remains the only ingestion path.
   - The `review_stage` CHECK constraint change (allowing `trainee` and `returned`) stays — the Trainee Review workflow depends on it.
   - Rows already recovered by the sweep and still valid (e.g. the Ally trainee test record) stay as they are.

4. **Verify**
   - Confirm no `reconcile` job remains in `cron.job`.
   - Confirm the function no longer responds.
   - Confirm the Review Queue still receives new appointments from a live GHL booking.

## Trade-off

Without the sweep, if GHL fails to deliver a create webhook (as happened with the "Test Johann" booking), that appointment will not appear in the Portal until someone notices and adds it manually. That was the original behavior.

## Technical scope

- Delete: `supabase/functions/reconcile-ghl-appointments/index.ts`
- Run `cron.unschedule('reconcile-ghl-appointments-every-15-minutes')`
- No schema change, no UI change.
