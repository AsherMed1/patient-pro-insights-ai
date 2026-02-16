

# Duplicate Cleanup + Unique Index for GHL Call Sync

## Step 1: Remove duplicate `ghl_id` rows from `all_calls`

Run a single migration that:
1. Deletes redundant duplicate rows (keeping the most recently updated record per `ghl_id`)
2. Creates the partial unique index on `ghl_id`

```sql
DELETE FROM public.all_calls
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY ghl_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
    FROM public.all_calls
    WHERE ghl_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_all_calls_ghl_id_unique 
ON public.all_calls (ghl_id) 
WHERE ghl_id IS NOT NULL;
```

- ~20,021 redundant duplicates removed
- 18,040 rows without ghl_id untouched
- 14,410 unique GHL call records preserved

## Step 2: Test with Clarity Care

After the migration succeeds, call the `sync-ghl-calls` edge function with a request scoped to Clarity Care only:

```json
{
  "projectName": "Clarity Care",
  "dateFrom": "2025-01-01",
  "dateTo": "2026-02-16"
}
```

This will verify that the full pipeline works end-to-end: GHL API fetch, data mapping, and upsert into `all_calls`.

## Step 3: Verify results

Query the `all_calls` table filtered to Clarity Care to confirm new records were written, then check the Project Performance Summary in the UI to confirm updated numbers appear.

