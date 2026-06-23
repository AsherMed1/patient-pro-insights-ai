## Root cause

All 4 contacts show `ghl_approved_tag_sent_at` populated in our DB, but 3 of them got that timestamp from yesterday's **assumption backfill** — not from a real GHL API call. So the `approved` tag was never actually pushed to GHL, and the workflow stayed in the wait step.

| Patient | Stamp source | Tag actually in GHL? |
|---|---|---|
| Ingrid Rivera-Rodriguez | Real call today 19:56 | Likely yes |
| Mollie Blacknell | Backfill 06-22 | No |
| Jennifer L Ingle | Backfill 06-22 | No |
| Calvin Collins | Backfill 06-22 | No |

The retry sweep skipped them because the stamp was set — it trusted the timestamp instead of verifying GHL.

## Fix

### 1. Immediate — retag the 4 stuck contacts
- Null out `ghl_approved_tag_sent_at` for these 4 rows (forces them back into the retry queue).
- Invoke `retry-missing-ghl-approved-tags` once — it will call `update-ghl-contact-tags` with each project's `ghl_api_key`, push `approved`, then re-stamp only on a real 200.
- Verify by re-reading the rows: each should have a fresh stamp dated today.

### 2. Harden — make the retry sweep verify, not assume
Update `retry-missing-ghl-approved-tags` so that for every approved row in scope it:
1. `GET https://services.leadconnectorhq.com/contacts/{ghl_id}` with the project's key.
2. If `tags` already contains `approved` → stamp `ghl_approved_tag_sent_at` and move on (cheap self-heal for backfilled rows that happened to be tagged through other means).
3. If not → POST the tag, then stamp only on 2xx.
4. Broaden the scope of the sweep to also include rows where `ghl_approved_tag_sent_at` IS NOT NULL **but** was written by yesterday's backfill — easiest signal is `ghl_approved_tag_sent_at = updated_at` AND `updated_at < 2026-06-23 19:00 UTC` (the backfill window). Run once, then drop that branch.
5. Per-row try/catch + small delay so one bad project key doesn't kill the batch.

### 3. Optional but recommended
Schedule the hardened sweep on pg_cron every 30 min so any future silent failure (transient network, closed tab on Approve) self-heals without manual triage.

## Out of scope
- No UI changes.
- No tag-name change (workflow listens for lowercase `approved`, which is what we already send).
- No edits to the manual Approve path in `ReviewQueue.tsx` — it already stamps only on success; this plan only fixes the backfill blind spot.

## Files touched
- `supabase/functions/retry-missing-ghl-approved-tags/index.ts` — add GHL verification GET, widen scope, per-row resilience.
- One data-only SQL run to null the 4 stamps + invoke the sweep.
- (If you approve step 3) one `supabase--insert` to schedule the cron job.