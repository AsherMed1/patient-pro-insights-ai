

# Fix: Accurate Call Data via GHL Messages API

## Problem

The `sync-ghl-calls` edge function uses the GHL **Conversations/Search** API, which returns one record per contact conversation. This causes three accuracy problems:

1. **Undercounting** -- If a contact had 10 calls, only 1 record is stored (keyed by contactId)
2. **Wrong direction** -- The `lastMessageDirection` field reflects only the latest message, not each call. The database currently shows 38,918 outbound vs 865 inbound, which is clearly wrong.
3. **No duration** -- Duration is always 0 because the Conversations API does not return call duration

## Solution

Refactor the edge function to use a two-step process:

1. **Step 1** -- Use `GET /conversations/search` (same as now) to discover conversations that contain calls
2. **Step 2** -- For each conversation, call `GET /conversations/{conversationId}/messages` to retrieve **individual call messages** (filtered to `TYPE_CALL`)

Each message has its own `direction`, `dateAdded` (timestamp), `messageId`, and call metadata -- giving us accurate per-call records.

## Technical Changes

### 1. Refactor `supabase/functions/sync-ghl-calls/index.ts`

- Keep the existing conversation search as a discovery step
- Add a new function `fetchCallMessages(apiKey, conversationId)` that calls `GET /conversations/{conversationId}/messages`
- For each conversation returned, fetch its messages and filter for `TYPE_CALL` entries
- Map each call message to an `all_calls` record with:
  - `ghl_id` = message ID (unique per call, not per contact)
  - `direction` = message-level direction (accurate per call)
  - `call_datetime` = message `dateAdded`
  - `duration_seconds` = extracted from call metadata if available
  - `status` = derived from call status (answered, missed, voicemail, etc.)
- Add rate limiting (pause between API calls) to avoid hitting GHL rate limits
- Add a `limit` on conversations per project to keep execution time under the edge function timeout

### 2. Database: Update unique constraint

The current `ghl_id` constraint stores contact IDs. The refactored function will store message IDs instead. Since message IDs are different from contact IDs, existing records will not conflict -- new records will be inserted alongside old ones. A cleanup step will remove old contact-ID-based records after successful sync.

### 3. Frontend: No changes needed

The `ProjectCallSummaryTable` and `get_project_call_summary` RPC function already aggregate from `all_calls` correctly. Once the data is accurate, the table will show correct numbers automatically.

## Execution Flow

```text
For each project with GHL credentials:
  1. Search conversations (lastMessageType = TYPE_CALL, date filtered)
  2. For each conversation:
     a. GET /conversations/{id}/messages
     b. Filter messages where type = TYPE_CALL
     c. Map each call message to an all_calls record
     d. Upsert batch (ON CONFLICT ghl_id = messageId)
  3. Pause 500ms between conversation message fetches (rate limiting)
```

## Risks and Mitigations

- **Edge function timeout**: GHL rate limits and large conversation counts could cause timeouts. Mitigation: Process a max of 100 conversations per project per sync invocation. Users can run multiple syncs to catch up.
- **API rate limits**: GHL allows ~100 requests/minute. Mitigation: 500ms delay between message fetches, and batch processing.
- **Old data cleanup**: After the refactor, old records keyed by contactId will remain. A one-time cleanup query will remove records where `ghl_id` matches a contactId pattern rather than a messageId pattern (or simply delete records with `duration_seconds = 0` and re-sync).

## Files Changed

- `supabase/functions/sync-ghl-calls/index.ts` -- Major refactor to add per-message fetching

