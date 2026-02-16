
# Fix: Enable Call Sync by Adding Unique Constraint and Re-syncing

## Problem
The `all_calls` table has no data after November 3, 2025. Today's calls exist in GHL but are not being synced because the `sync-ghl-calls` edge function's upsert requires a proper unique constraint on `ghl_id`, which is currently only a partial index (not recognized by PostgREST).

## Steps

### 1. Database Migration -- Replace partial index with unique constraint
```sql
DROP INDEX IF EXISTS idx_all_calls_ghl_id_unique;
ALTER TABLE public.all_calls ADD CONSTRAINT all_calls_ghl_id_unique UNIQUE (ghl_id);
```
This allows the `ON CONFLICT ('ghl_id')` upsert in the edge function to work.

### 2. Deploy the updated `sync-ghl-calls` edge function
The function was already updated with the correct direction detection logic. It just needs to be deployed (it will deploy automatically with the code changes already made).

### 3. Trigger a sync
After the constraint is in place, invoke the sync function to pull call data from GHL for all projects. This will populate the table with current data including today's calls.

### 4. Verify
Confirm the Reporting tab's Project Performance Summary shows inbound and outbound call counts.

## Technical Details

- **Database change**: One migration to swap the partial index for a `UNIQUE` constraint on `all_calls.ghl_id`
- **Edge function**: Already updated in a previous edit (`supabase/functions/sync-ghl-calls/index.ts`) -- no further code changes needed
- **Frontend**: No changes needed -- the table already queries the correct RPC function
