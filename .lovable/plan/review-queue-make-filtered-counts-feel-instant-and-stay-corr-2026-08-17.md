# Review Queue: make filtered counts feel instant and stay correct

## What's happening

The counts do update, but each keystroke fires four separate exact-count queries against a ~23k-row table with `ilike` matching, so the badges land a second or two after the list. There is no debounce on the search box, so typing "dewa" fires four rounds of eight queries; whichever round replies last wins, which can also leave a stale number on screen.

## What changes

- **Debounce the search input (300 ms).** Typing no longer fires a query per keystroke; both the list and the counts run once when typing pauses. Project and date filters still apply immediately.
- **Discard out-of-order responses.** Each count run gets a sequence number and only the newest run is allowed to write to state, so a slow earlier request can't overwrite a fresh result.
- **Show that counts are recalculating.** While a count run is in flight the four badges dim slightly (reduced opacity), so a stale-looking number is visibly "in progress" rather than wrong.

## Technical notes

`src/components/admin/ReviewQueue.tsx`:

- Add `searchInput` state bound to the input, plus a `useEffect` with a 300 ms `setTimeout` that copies it into the existing `search` state (clear the timer on cleanup). `fetch` and `fetchCounts` keep depending on `search`, so both stay debounced.
- Add a `countsSeq` ref: increment at the start of `fetchCounts`, capture the value, and only call `setNewCount` / `setPendingCount` / `setDeclinedCount` / `setApprovedCount` if the ref still matches when the promises resolve.
- Add `countsLoading` state set true at the start and false at the end of the newest `fetchCounts` run; apply `className={cn(countsLoading && 'opacity-60 transition-opacity')}` to the tab-count badge row.
