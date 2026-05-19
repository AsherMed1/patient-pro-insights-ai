# Fix Review Queue badge showing phantom pending count

## Problem

The Review Queue tab badge says **12 pending** but only **1 row** is visible. The badge and the list are using different queries:

- **Tab badge** (`src/pages/Index.tsx` line 121-124): counts ALL `all_appointments` where `review_status = 'pending'`.
- **Queue list** (`src/components/admin/ReviewQueue.tsx`): excludes the exempt projects (ECCO Medical, Premier Vascular, Premier Vascular Surgery) and reserved blocks.

The 11 "missing" rows are pending appointments for the exempt projects (and possibly reserved blocks) that the list correctly hides but the badge still counts. The previously proposed backfill migration either hasn't run or new exempt-project rows have come in since.

## Fix

1. **`src/pages/Index.tsx`** — Update the badge query to mirror the list filter so the two numbers match:
   - Add `.not('project_name', 'in', '("ECCO Medical","Premier Vascular","Premier Vascular Surgery")')`
   - Add `.or('is_reserved_block.is.null,is_reserved_block.eq.false')`

2. **Backfill** — Run a one-time SQL update to set `review_status = 'approved'` for any existing `pending` rows whose `project_name` is in the exempt list, so they stop polluting any other counts/queries. (The migration was drafted previously; re-confirm it has applied. If not, apply it.)

## Out of scope

No UI redesign. No changes to the queue list itself — it's already correct.
