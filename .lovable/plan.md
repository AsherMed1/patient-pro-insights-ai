
## Change Default Sort to "Created Date, Newest First"

### What's happening now

In `src/components/AllAppointmentsManager.tsx`, two `useState` defaults control the initial sort behavior:

```typescript
// Line 71
const [dateFilterType, setDateFilterType] = useState<'appointment' | 'created'>('appointment');

// Line 72
const [sortBy, setSortBy] = useState<...>('date_desc');
```

- `dateFilterType = 'appointment'` → the date column used for filtering and sorting is `date_of_appointment`
- `sortBy = 'date_desc'` → descending order on whichever date column is active

The result: on first load, records are sorted by **appointment date** descending — not by when the lead was created.

### The fix

Change the `dateFilterType` default from `'appointment'` to `'created'`. The `sortBy` can stay `'date_desc'` since that already means "newest first." With `dateFilterType = 'created'`, the sort column automatically switches to `created_at` (line 353 in the same file).

**File:** `src/components/AllAppointmentsManager.tsx`

**Line 71 — change:**
```typescript
// Before
const [dateFilterType, setDateFilterType] = useState<'appointment' | 'created'>('appointment');

// After
const [dateFilterType, setDateFilterType] = useState<'appointment' | 'created'>('created');
```

That single character change (`'appointment'` → `'created'`) is the entire fix. No other logic needs to change because:

- The sort query on line 353 already checks `dateFilterType === 'created' ? 'created_at' : 'date_of_appointment'`
- The filter query on line 512 does the same
- The "Reset" button on line 1243 will still reset back to `'appointment'` (that's intentional reset behavior)
- The `sortBy = 'date_desc'` default already means "newest first," so the UI dropdown will correctly read "Newest First" on load

### Visual result

On page load the portal will show appointments sorted by **Created Date, Newest First** — the most recently submitted intake forms appear at the top, which matches the clinic's workflow expectation.
