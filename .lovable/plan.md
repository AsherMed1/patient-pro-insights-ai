## Fix: write-path verification + narrow hourly cron + backfill these 5

Same plan as approved, plus a one-shot backfill for the 5 new leads.

### Part 1 — Backfill the 5 new leads (immediate)

Confirmed all 5 in `Richmond Vascular Center` (7 appointment rows; Geraldine + Wendy each have 2 with the same `ghl_id`, so the GHL tag push is idempotent):

| Lead | ghl_id | stamp state |
|---|---|---|
| Anita Robertson | Jm2aJGXhNkozfvSJkzuI | stamped (Group B) |
| David Carter | mi5OYp99K3dPKoeGIrBl | stamped (Group B) |
| Geraldine Sykes (×2) | 08YWTqHCyEATPl6XGcf2 | stamped (Group B) |
| Theresa Young | UQhr4FHowiRs66dfHjJZ | stamped (Group B) |
| Wendy Terry / Wendy Terry1 (×2) | gB8Aqeti8vVYpVcviD9U | 1 NULL + 1 stamped |

Invoke `retry-missing-ghl-approved-tags` once with `force_ids` for all 7 row ids and `include_backfilled: true` (re-verifies each against GHL, only pushes if actually missing).

### Part 2 — Write-path verification (prevents new occurrences)

**`src/components/admin/ReviewQueue.tsx`** approve branch (~lines 614–635):
After `update-ghl-contact-tags` returns success, GET `https://services.leadconnectorhq.com/contacts/{ghl_id}` with project's `ghl_api_key`. Only stamp `ghl_approved_tag_sent_at` if `contact.tags` contains `approved`. On verify failure: log + skip stamp + softer toast ("Approved — GHL tag will retry"). Non-blocking.

**`supabase/functions/ghl-webhook-handler/index.ts`** Setter Submitted branch (~lines 291–322):
Inside the existing fire-and-forget `.then`, do the same verify GET before stamping. Stays background — webhook latency unchanged.

### Part 3 — Narrow hourly cron sweep (safety net for "errored on approve")

Enable `pg_cron` + `pg_net`, then via `supabase--insert`:

```sql
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

No `include_backfilled` → only sweeps rows where `ghl_approved_tag_sent_at IS NULL`. Skips already-stamped rows (won't fight manual GHL removals, no doubled API load). Exempt projects already handled by the function.

### Files

- One-shot edge function call (backfill 5 leads)
- `src/components/admin/ReviewQueue.tsx` — verify-after-write
- `supabase/functions/ghl-webhook-handler/index.ts` — verify-after-write in `.then`
- `supabase--insert` SQL to create cron job (no migration — contains project-specific URL + anon key per scheduling guidance)

### Verify

1. Backfill response: `succeeded` + `already_tagged` counts per row, `failed: 0`.
2. `select jobname, schedule, active from cron.job;` shows the new job.
3. After top of next hour, `retry-missing-ghl-approved-tags` logs show processing.
4. Approve a test lead with a deliberately bad ghl_api_key → stamp stays NULL, toast says "will retry", next cron run picks it up.

### Out of scope

Re-verification of already-stamped rows (use the on-demand `force_ids` + `include_backfilled` path, as today, if a tag gets removed in GHL post-approval).
