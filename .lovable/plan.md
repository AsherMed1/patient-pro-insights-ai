

# Fix Call Tabs Showing 0 -- Optimize Data Fetching

## Root Cause

Both `CallCenterDashboard.tsx` and `CallTeamTab.tsx` use `select('*')` to fetch 47,000+ call records and thousands of appointment records. Each record includes heavy columns (JSON fields, transcription text, audio URLs, etc.) that are never used for computing metrics. This causes requests to time out or fail silently, resulting in all metrics showing as 0.

The `ProjectCallSummaryTable` works fine because it only fetches `project_name, direction` -- two small columns.

## Fix

### 1. `src/components/CallCenterDashboard.tsx`

Replace `select('*')` with only the columns actually needed for metric calculations:

- **Calls query**: Change `select('*')` to `select('agent, duration_seconds, date, project_name')`
- **Appointments query**: Change `select('*')` to `select('agent, date_of_appointment, date_appointment_created, project_name')`

This reduces payload size by roughly 90%, making the paginated fetches complete in seconds instead of timing out.

### 2. `src/components/callteam/CallTeamTab.tsx`

Same optimization:

- **Calls query**: Change `select('*')` to `select('agent, duration_seconds, date')`
- **Appointments query**: Change `select('*')` to `select('agent, date_of_appointment')`

## Why This Works

- Current: ~47,000 rows x ~50 columns (including large JSON blobs) = massive payload
- After fix: ~47,000 rows x 3-4 small columns = fast, lightweight queries
- No database changes needed -- just selecting fewer columns on the client side

