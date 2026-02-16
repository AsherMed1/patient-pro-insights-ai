

# Fix: Project Performance Summary Not Pulling Updated Data

## Problem
The "Sync from GHL" button in the Project Performance Summary calls the `sync-ghl-calls` edge function, but call data hasn't been synced since October 2025. The function has several issues preventing it from fetching actual phone call data.

## Root Cause Analysis

The `sync-ghl-calls` edge function has three critical bugs:

1. **No call type filter**: The GHL Conversations Search API returns ALL conversation types (SMS, email, webchat, etc.), not just phone calls. The function never sets `lastMessageType=TYPE_CALL`, so it mixes in non-call data or returns conversations that aren't phone calls.

2. **Wrong API version header**: The function sends `Version: 2021-07-28`, but the GHL Conversations Search API requires `Version: 2021-04-15`. This may cause the API to reject or return unexpected results.

3. **Wrong date parameter format**: The `startAfterDate` parameter expects a Unix timestamp (milliseconds), not an ISO date string. Passing ISO strings causes the date filtering to fail silently.

4. **Missing direction detection**: The function maps `lastMessageDirection` generically, but for calls it should detect inbound vs outbound based on the call-specific fields in the conversation response.

## Solution

Rewrite the `sync-ghl-calls` edge function to properly sync phone call data from GHL:

**File: `supabase/functions/sync-ghl-calls/index.ts`**

Changes:
- Add `lastMessageType=TYPE_CALL` filter to only fetch phone call conversations
- Fix the API version header to `2021-04-15`
- Convert date parameters to Unix timestamps (milliseconds) for `startAfterDate`/`endAfterDate`
- Use the `lastMessageDate` field correctly for pagination cursor (it's a sort value, not a date filter)
- Improve direction detection and data mapping
- Add proper logging for debugging credential and API issues
- Log credential metadata (prefix, length) for debugging without exposing secrets

## Technical Details

### Key Code Changes

```typescript
// 1. Fix API version
const GHL_API_VERSION = '2021-04-15';

// 2. Add TYPE_CALL filter
const params = new URLSearchParams({
  locationId,
  limit: String(limit),
  lastMessageType: 'TYPE_CALL',  // Only fetch phone calls
});

// 3. Fix date filtering - use Unix timestamps
if (startAfterDate) {
  params.set('startAfterDate', String(new Date(startAfterDate).getTime()));
}

// 4. Fix pagination - use lastMessageDate as cursor
if (lastCursor) {
  params.set('startAfterDate', lastCursor);
}
```

### Existing Infrastructure (No Changes Needed)
- The `projects` table already stores `ghl_api_key` (Private Integration Tokens with `pit-` prefix) and `ghl_location_id` for each project
- The `all_calls` table schema is correct for storing the synced data
- The `get_project_call_summary` RPC function correctly aggregates from `all_calls`
- The frontend `ProjectCallSummaryTable` component correctly calls the sync function and refreshes data

### What Won't Change
- No database schema changes needed
- No frontend changes needed
- The "Sync from GHL" button behavior stays the same
- The date filters and quick filters continue to work as-is

