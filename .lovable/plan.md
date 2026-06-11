## Fix Review Queue actions column overflow

**Cause:** In `src/components/admin/ReviewQueue.tsx` the row grid template (lines 937 and 970) ends with a fixed `300px` Actions column:

```
grid-cols-[28px_minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(220px,1.6fr)_minmax(120px,0.9fr)_300px]
```

On a duplicate row the action cell renders 5 buttons (Replace, Keep Existing, Approve, OON, Decline ≈ 520px) inside a single-line `flex gap-1 justify-end`, so they overflow leftward into the Appointment column.

### Fix

1. Widen the Actions column and let it grow:
   - Replace `300px` with `minmax(300px,auto)` in both the header (line 937) and the row (line 970) grid templates — so non-duplicate rows still get a compact column, but rows with duplicates expand to fit.
2. Allow the button cluster to wrap when space is tight, on the action `<div>` at line 1020:
   - `flex gap-1 justify-end` → `flex flex-wrap gap-1 justify-end`
3. No copy or behavior changes; no other files touched.

### Files
- `src/components/admin/ReviewQueue.tsx`
