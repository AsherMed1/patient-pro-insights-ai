
# Fix: Inbound Call Direction Detection in GHL Sync

## Problem
Every call synced from GoHighLevel is classified as "outbound" because the direction detection logic checks for the string `"inbound"`, but the GHL Conversations Search API returns `lastMessageDirection` with a numeric value (`1` for inbound, `2` for outbound) or uses `"incoming"` instead of `"inbound"`.

Current broken code:
```typescript
const direction = (conv.lastMessageDirection || '').toLowerCase().includes('inbound')
  ? 'inbound'
  : 'outbound'
```

This never matches, so every call defaults to `"outbound"`.

## Solution

### 1. Update the `sync-ghl-calls` edge function

Fix the direction detection to handle all known GHL API response formats:

```typescript
const rawDir = String(conv.lastMessageDirection || '').toLowerCase().trim();
const direction = (rawDir === '1' || rawDir.includes('inbound') || rawDir.includes('incoming'))
  ? 'inbound'
  : 'outbound';
```

Also add a one-time debug log to capture the raw `lastMessageDirection` value from the first conversation on each page, so we can confirm the exact format GHL returns.

### 2. Backfill existing records

After deploying the fix, re-run the sync for all projects. Since the unique index is now in place, the upsert will update the `direction` field on existing records with the correct value.

### 3. Test with a known project

Invoke the sync for a single project (e.g., "Clarity Care" or "Texas Vascular Institute") and verify that inbound calls now appear in the database and in the Project Performance Summary table.

## Technical Details

**File changed:** `supabase/functions/sync-ghl-calls/index.ts`
- Fix direction detection logic (lines ~130-133)
- Add debug logging for raw `lastMessageDirection` value

**No database changes needed** -- the unique index from the previous migration is already in place.

**No frontend changes needed** -- the UI already queries by `direction = 'inbound'` and will show data once records exist.
