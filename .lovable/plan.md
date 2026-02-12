

# Fix: Project Performance Summary Stuck Loading

## Root Cause

In `ProjectCallSummaryTable.tsx`, line 172, after a successful GHL sync:

```typescript
// Re-fetch data after sync
setLoading(true);  // <-- sets loading skeleton, but nothing triggers the useEffect
```

The `useEffect` on line 94 only depends on `[dateFrom, dateTo]`. Since neither changes after a sync, the data fetch never re-runs and the component stays stuck showing skeleton loaders.

## Fix

Replace the manual `setLoading(true)` with a proper re-fetch mechanism. Add a `refreshKey` counter to the component state and include it in the `useEffect` dependency array. After a successful sync, increment the counter to trigger a re-fetch.

### Changes to `src/components/dashboard/ProjectCallSummaryTable.tsx`

1. Add a `refreshKey` state variable: `const [refreshKey, setRefreshKey] = useState(0);`
2. Add `refreshKey` to the `useEffect` dependency array: `[dateFrom, dateTo, refreshKey]`
3. Replace `setLoading(true)` on line 172 with `setRefreshKey(k => k + 1)` -- this triggers the useEffect which already handles setting loading state

This is a minimal, targeted fix -- just 3 lines changed.

