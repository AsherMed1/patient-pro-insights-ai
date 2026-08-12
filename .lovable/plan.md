# Keep Review Queue dates in live sync with GoHighLevel

The reconciliation pieces are already built and working: the webhook debounce is now echo-aware (a different date or time from GHL is always applied), and the `sync-ghl-appointment-times` function correctly detects real drift (last dry run: 60 records checked, 60 in sync, 0 false positives). Two things are still missing before the Review Queue truly stays current on its own.

## What's missing

1. **Nothing runs the reconciliation automatically.** Only two scheduled jobs exist today — the approved-tag retry and the short-notice sweep. The new sync function has to be triggered by hand.
2. **No way for a reviewer to force a check.** If someone is looking at a row right now and suspects it is stale, they have to wait.

## The fix

1. **Schedule the sweep every 15 minutes.** Add a `sync-ghl-appointment-times` cron job alongside the existing short-notice sweep, calling the function with `{ sweep: true }`. It covers every non-superseded, non-reserved row that is awaiting review or booked in the future, corrects any drift, and logs a reschedule-history entry plus an audit note for each correction.

2. **Add a per-row "Sync with GHL" action in the Review Queue.** A small refresh action on each row re-pulls that appointment from GoHighLevel, applies any date/time change immediately, and shows a toast saying either "Already up to date" or "Updated to <new date/time>".

3. **Make the queue-level Refresh button check GHL too.** The existing Refresh currently only re-reads the portal database. It will first run the sync for the currently visible rows, then reload — so a reviewer clicking Refresh sees genuinely current data rather than a re-render of stale rows.

## Technical notes

- Cron job via `pg_cron` + `pg_net`, `*/15 * * * *`, mirroring the `sweep-short-notice-pending` job definition.
- Review Queue changes are confined to `src/components/admin/ReviewQueue.tsx`, invoking `supabase.functions.invoke('sync-ghl-appointment-times', { body: { appointment_ids: [...] } })` and refetching on a `corrected` result.
- No schema changes. No changes to the webhook handler or the sync function itself.
