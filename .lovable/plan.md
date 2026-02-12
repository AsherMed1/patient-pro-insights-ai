

# Fix Project Performance Summary: Server-Side Aggregation

## Problem

The table fetches **all 52,000+ call records and 10,000+ appointment records** row-by-row in batches of 1,000 from the client, just to count them by project. This requires 50+ sequential HTTP requests, causing timeouts and stale/missing data.

## Solution

Replace the client-side pagination loop with a **Supabase database function** that performs the aggregation server-side and returns only the summary counts per project.

## Technical Steps

### 1. Create a database function: `get_project_call_summary`

A new PostgreSQL function that accepts optional date range parameters and returns aggregated counts per project:

- Queries `all_calls` for inbound/outbound counts grouped by `project_name`
- Queries `all_appointments` for confirmed appointment counts grouped by `project_name`
- Combines results using a FULL OUTER JOIN
- Excludes the demo project ("PPM - Test Account")
- Returns one row per project with: `project_name`, `inbound`, `outbound`, `confirmed`

This replaces 50+ HTTP requests with a **single RPC call**.

### 2. Update `ProjectCallSummaryTable.tsx`

- Remove the `fetchAllPaginated` helper function
- Replace the `useEffect` data fetching with a single `supabase.rpc('get_project_call_summary', { ... })` call
- Pass `p_date_from` and `p_date_to` parameters for date filtering
- Map the returned rows directly into the stats object
- Keep all existing UI (filters, sync button, table layout) unchanged

### Result

- Data loads in **one request** instead of 50+
- Aggregation happens on the database server (fast)
- Table will show current data reliably
- No changes to the visual UI or filter behavior

