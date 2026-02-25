

## Investigation: `sync-ghl-calls` Edge Function -- Root Causes for Missing Data

### Summary of the Problem

The CSV (GHL source of truth) shows ~16,700 total calls across 41 sub-accounts for February. The database has ~1,600 calls across 19 projects. That is roughly **10% capture rate**. 22 projects have zero calls synced despite having valid GHL credentials.

### Root Causes Identified

There are **three compounding bottlenecks** in the current function:

---

#### 1. Hard Cap: `MAX_CONVERSATIONS_PER_PROJECT = 100` (Line 10)

The function fetches at most 100 conversations per project. But a single conversation = one contact, not one call. Texas Vascular Institute has 1,254 calls in February -- even if every conversation had exactly one call, the function would miss 92% of them. Many projects have 500-700+ calls, meaning the 100-conversation cap misses the vast majority.

#### 2. Wrong API Filter: `lastMessageType: 'TYPE_CALL'` (Line 39)

The Conversations Search API is filtered to only return conversations where the **most recent message** was a call. If a contact had a call on Feb 5, then received a text on Feb 10, that conversation is excluded from the search results entirely. This silently drops a large percentage of call-containing conversations.

#### 3. Timeout / Sequential Processing of 40+ Projects

The function processes all projects sequentially with 600ms rate-limit delays between conversations. For 40 projects x 100 conversations x 600ms = **40 minutes minimum**. Even with `EdgeRuntime.waitUntil`, Supabase Edge Functions have a wall-clock limit. The function likely times out partway through, leaving later projects unsynced. This explains why some projects have data and others have zero.

---

### Proposed Fix: Per-Project Paginated Sync

Restructure the sync to process **one project per function call** with **resumable cursor-based pagination**, removing the conversation cap and the broken filter.

#### Changes

| File | Change |
|------|--------|
| `supabase/functions/sync-ghl-calls/index.ts` | Rewrite to process one project per invocation, remove 100-conversation cap, remove `lastMessageType` filter (fetch ALL conversations then check for calls in messages), add cursor storage for resumability |
| New migration | Create `call_sync_cursors` table to store pagination state per project |
| `src/components/dashboard/ProjectCallSummaryTable.tsx` | Update sync trigger to loop through projects one at a time, calling the function repeatedly |
| `src/components/CallCenterDashboard.tsx` | Same loop-per-project pattern |

#### Technical Detail

**New edge function flow (one project per call):**

```text
Client calls: sync-ghl-calls { projectName: "Texas Vascular Institute", dateFrom, dateTo }
  |
  v
Function reads cursor from call_sync_cursors table (if resuming)
  |
  v
Fetches up to 500 conversations (no lastMessageType filter)
  Uses cursor for pagination across calls
  |
  v
For each conversation, fetches messages and filters for call type
  |
  v
Upserts call records to all_calls
  |
  v
Saves cursor to call_sync_cursors table
  |
  v
Returns { hasMore: true/false, synced: N, cursor: "..." }
```

**Client-side loop:**
```text
for each project:
  let hasMore = true
  while (hasMore):
    result = invoke('sync-ghl-calls', { projectName, dateFrom, dateTo })
    hasMore = result.hasMore
    update progress UI
```

**Key differences from current approach:**
- No `MAX_CONVERSATIONS_PER_PROJECT` cap -- processes all conversations
- No `lastMessageType: 'TYPE_CALL'` filter -- scans all conversations for call messages
- One project per invocation -- no timeout risk
- Cursor-based resumability -- can pick up where it left off if interrupted
- Progress tracking -- frontend can show sync status per project

This should bring the capture rate from ~10% to near 100%, matching the CSV numbers.

