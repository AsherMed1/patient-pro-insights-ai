

## Fix: Call Message Date Filtering in sync-ghl-calls

### Problem
The sync has processed 440+ conversations and synced 1,581+ records for Texas Vascular Institute, but February inbound is still stuck at 66. The reason: the edge function pulls **all call messages** from each conversation regardless of date. Most synced records are from other months (total across all months is now 5,850).

### Change

| File | Change |
|------|--------|
| `supabase/functions/sync-ghl-calls/index.ts` | Add date filtering when processing individual call messages — skip any message whose `dateAdded` falls outside `dateFrom`/`dateTo` |

### Technical Detail

On line 223-237, inside the `for (const msg of messages)` loop, add a date range check before pushing the record:

```typescript
for (const msg of messages) {
  const dt = msg.dateAdded || new Date().toISOString()
  
  // Filter call messages by date range if provided
  if (dateFrom && new Date(dt) < new Date(dateFrom)) continue
  if (dateTo && new Date(dt) > new Date(dateTo)) continue
  
  // ... rest of record creation unchanged
}
```

This ensures the `synced` count and `totalSynced` only reflect February calls, giving us an accurate comparison against the CSV's 136 inbound. After deploying, we should also clear the stale cursor entry (the one with null dates) and re-run the sync for Texas Vascular Institute to verify accuracy.

