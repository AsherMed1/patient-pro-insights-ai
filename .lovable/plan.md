

# Sync Call Data from GoHighLevel on Demand

## Problem
The `all_calls` table has no records after November 2025. The current pipeline relies entirely on external systems POSTing to the `all-calls-api` endpoint, which appears to have stopped. When you set the filter to "Today," the dashboard correctly queries the database but finds nothing.

## Solution
Build a "Sync from GHL" feature that actively pulls call/conversation data from GoHighLevel's API and inserts it into the database. Add a sync button to the Project Performance Summary table so you can trigger a refresh on demand.

## Architecture

```text
[Dashboard Filter Changed]
        |
        v
[User clicks "Sync" button]
        |
        v
[Edge Function: sync-ghl-calls]
        |
        v
[For each active project with GHL API key:]
  - GET /conversations/search?locationId=X&type=TYPE_CALL&startAfterDate=FROM&endAfterDate=TO
  - Map GHL conversation data to all_calls schema
  - Upsert into all_calls (skip duplicates via ghl_id)
        |
        v
[Dashboard re-fetches from database]
```

## Changes

### 1. New Edge Function: `supabase/functions/sync-ghl-calls/index.ts`

- Accepts `dateFrom` and `dateTo` (ISO strings) plus optional `projectName` filter
- Queries the `projects` table for active projects with `ghl_api_key` and `ghl_location_id`
- For each project, calls GHL's Conversations Search API (`GET /conversations/search`) with:
  - `locationId` = project's `ghl_location_id`
  - Query filtered to call-type conversations within the date range
- Maps each conversation to the `all_calls` schema (lead name, phone, direction, duration, agent, date)
- Upserts into `all_calls` using `ghl_id` to prevent duplicates
- Uses `EdgeRuntime.waitUntil()` for background processing if syncing multiple projects
- Returns immediate response with sync status

### 2. Update `supabase/config.toml`

- Add `[functions.sync-ghl-calls]` with `verify_jwt = false` (auth checked in code)

### 3. Update `src/components/dashboard/ProjectCallSummaryTable.tsx`

- Add a "Sync from GHL" button (with a refresh icon) next to the filter bar
- When clicked, calls the `sync-ghl-calls` edge function with the current date range
- Shows a loading spinner during sync
- After sync completes, re-fetches the table data from the database
- Displays a toast with the sync result (e.g., "Synced 24 new call records")

### 4. Update `src/components/CallCenterDashboard.tsx`

- Add the same sync button in the dashboard header area
- Reuses the same edge function call pattern

## Important Notes

- GHL's Conversations Search API may not return all the same fields currently in `all_calls` (like `duration_seconds`). The edge function will map what is available and leave other fields null.
- The sync is on-demand (button click), not automatic on every filter change, to avoid excessive API calls to GHL.
- Existing records won't be duplicated thanks to `ghl_id`-based upsert logic.
- All projects already have `ghl_api_key` and `ghl_location_id` configured in the database.

