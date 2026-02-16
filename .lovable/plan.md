

# Fix: Add Unique Constraint for GHL Call Sync

## Current Status
The `sync-ghl-calls` function is now correctly fetching phone call data from GoHighLevel (confirmed in logs), but **every database write fails** because the `all_calls` table lacks a unique constraint on the `ghl_id` column. The upsert operation requires this constraint to detect and skip duplicates.

## Solution
Add a partial unique index on `all_calls.ghl_id` (only for non-null values) so the upsert can work.

## Technical Details

**Database change:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_all_calls_ghl_id_unique 
ON public.all_calls (ghl_id) 
WHERE ghl_id IS NOT NULL;
```

This is a partial unique index that:
- Only applies to rows where `ghl_id` is not null (existing rows without a GHL ID are unaffected)
- Prevents duplicate GHL call records from being inserted
- Enables the `ON CONFLICT ('ghl_id')` upsert that the sync function uses

No other file changes are needed. Once this index is in place, clicking "Sync from GHL" will successfully write call data to the database and the Project Performance Summary will show updated numbers.

