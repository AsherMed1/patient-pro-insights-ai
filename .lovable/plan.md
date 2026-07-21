## Fix: QA Operations Queue search doesn't update bucket counts

### Current behavior
- `fetchCases` loads cases for the **active tab only** (`.eq('workflow_status', tab)`), then `filtered` applies search + filters **client-side**.
- `fetchCounts` counts every case per status **ignoring** search, project, alert, assignment, and date filters — so "New 758 / In Review 4 / Pending 3 / Completed 1" stays static while typing.
- Consequence: while searching "Joe", the visible list narrows but the tab badges still show total volume, and there's no signal telling the user which bucket the match lives in.

### Change (frontend only, `src/components/admin/QAOperationsQueue.tsx`)

1. **Load across all statuses when searching/filtering.** Drop the `.eq('workflow_status', tab)` clause in `fetchCases` and always load up to 500 cases across every workflow status. The tab becomes a client-side view of the same result set. Re-run `fetchCases` when filters change (currently it only re-runs on `tab` change).

2. **Derive bucket counts from the same filter pipeline used for the visible rows.** Replace `fetchCounts` with a memoized `bucketCounts` computed from the fully filtered list (search + project + alert + assignment + date). Each tab badge shows the count of matches in that status; buckets with zero matches show `0` (dimmed) so it's obvious no match lives there.

3. **Make the matching bucket obvious.**
   - When a search or filter is active, prefix badges of buckets with matches with a subtle highlight (accent ring / bolded number) so the user can see at a glance which status contains the results.
   - If the currently selected tab has 0 matches but another bucket has matches, auto-switch the active tab once to the first non-empty bucket (New → In Review → Pending / Escalated → Completed) so results are visible without a manual click. Only auto-switch when the search term or filter actually changes, never on tab clicks — the user can always click back.
   - Keep the existing "All" tab as an escape hatch showing the combined filtered list.

4. **Keep realtime + refresh paths consistent.** `postgres_changes` subscription and `onRefresh` (from the detail modal) call the new single `fetchCases`; counts recompute automatically from state.

### Out of scope
- No schema changes, no server-side changes, no changes to filtering semantics beyond making counts respect them.
- Row layout, columns, and "Latest Alert" ordering stay identical.

### Technical notes
- Loading all statuses is fine: the current 500-row cap already applies; ordering by `entered_queue_at DESC` is preserved. If the caller has >500 cases across all statuses, the same cap that already applied per-tab now applies globally — acceptable given the queue view is already list-limited.
- `useEffect` dependency list expands to include filter inputs so a filter change re-queries (search stays fully client-side; only the initial fetch depends on tab-less loading).
