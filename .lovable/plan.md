

## Fix: sync-ghl-calls Cursor Persistence and Timeout Issues

### Problems Found in Logs

**1. Cursor is never read back (Clarity Care infinite loop)**

The logs show Clarity Care syncing repeatedly with `prevProcessed=0` despite the cursor table having a valid row. The bug is on lines 190-193 of the edge function:

```typescript
.is('date_from', dateFrom || null)   // BUG
.is('date_to', dateTo || null)       // BUG
```

The `.is()` operator in PostgREST is exclusively for `IS NULL` / `IS NOT NULL` checks. When `dateFrom` has a value like `"2026-02-01T05:00:00.000Z"`, this query returns zero rows. The cursor is saved but never found on the next call, so every invocation starts fresh and processes the same 100 conversations forever.

**2. Edge function timeout (Texas Vascular)**

`CONVERSATIONS_PER_BATCH = 100` with 600ms delays between each = 60+ seconds just for rate limiting, plus the time to fetch messages from each conversation. This exceeds the Supabase Edge Function wall-clock limit, causing the function to be killed before it can return.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/sync-ghl-calls/index.ts` | Fix cursor read to use `.eq()` for non-null date values and `.is()` only for null. Reduce `CONVERSATIONS_PER_BATCH` from 100 to 40 to stay within timeout. |

### Technical Detail

**Cursor read fix (lines 189-193):**
```typescript
// Before (broken):
.is('date_from', dateFrom || null)
.is('date_to', dateTo || null)

// After (correct):
// Use .eq() when value exists, .is() only for NULL
let cursorQuery = supabase
  .from('call_sync_cursors')
  .select('*')
  .eq('project_name', projectName)
  .eq('status', 'in_progress');

if (dateFrom) cursorQuery = cursorQuery.eq('date_from', dateFrom);
else cursorQuery = cursorQuery.is('date_from', null);

if (dateTo) cursorQuery = cursorQuery.eq('date_to', dateTo);
else cursorQuery = cursorQuery.is('date_to', null);
```

**Batch size reduction:**
```typescript
const CONVERSATIONS_PER_BATCH = 40  // was 100
```

With 40 conversations at 600ms delay = ~24 seconds for rate limiting, leaving plenty of headroom for API calls and DB writes.

**Cursor delete fix (same `.is()` bug on lines 273-276):**
Apply the same conditional `.eq()` / `.is()` pattern to the delete query that clears the cursor when sync completes.

These two fixes will allow the sync to:
- Actually resume from where it left off instead of restarting every time
- Complete within the edge function timeout for each batch
- Iterate through all conversations across multiple invocations until done

