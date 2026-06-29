## Final step: create the hourly cron safety net

Backfill ✅ done. Write-path verification ✅ shipped in both `ReviewQueue.tsx` and `ghl-webhook-handler/index.ts`. Only the cron job remains.

### What runs

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'retry-missing-ghl-approved-tags-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://bhabbokbhnqioykjimix.supabase.co/functions/v1/retry-missing-ghl-approved-tags',
    headers := '{"Content-Type":"application/json","apikey":"<anon>","Authorization":"Bearer <anon>"}'::jsonb,
    body := '{"batch_size":50}'::jsonb
  );
  $$
);
```

### Safety summary

- Function inherits `verify_jwt = false` → anon key is sufficient.
- Sweep filter is `ghl_approved_tag_sent_at IS NULL AND review_status='approved'` and excludes ECCO/Premier/Davis. Function verifies in GHL before pushing — no double-tagging.
- Hourly, batch 50. Typical run touches 0–5 rows.
- Anon key embedded in `cron.job` table — already public, no new exposure.
- Fully reversible: `select cron.unschedule('retry-missing-ghl-approved-tags-hourly');`

### Verify after run

1. `select jobname, schedule, active from cron.job where jobname = 'retry-missing-ghl-approved-tags-hourly';` → 1 row, active true.
2. After `:07` of the next hour: `select * from cron.job_run_details order by start_time desc limit 3;` → status `succeeded`.
3. `retry-missing-ghl-approved-tags` edge function logs show the run with a `found`/`processed` count.
