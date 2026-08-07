# QA Operations: stop the full-page refresh, update live instead

## What's happening now

The queue subscribes to every change on `qa_cases`. On any event — a new alert, someone else saving an audit, your own save — it re-runs the entire loader: all open cases (paged), all completed cases (paged), a count query, plus a batched lookup of phone/email for every appointment. While that runs, `loading` is true, so the whole table is swapped for a spinner and the view jumps back to the top. That is the "page refresh" feel.

## The fix: live row-level updates

1. **Patch rows in place instead of reloading everything.** Use the realtime payload directly:
   - UPDATE → replace just that case in the list (and refresh the open drawer's copy).
   - DELETE → remove that row.
   - INSERT → add the row to the list, enriching only that one record's phone/email.
   Sorting, tab counts, and filters recompute from the in-memory list, so nothing else moves.

2. **Never show the full-page spinner after the first load.** The spinner stays for the initial load only. Any later reload runs in the background with a small "Updating…" indicator in the header; the table and your scroll position stay put.

3. **Don't let your own saves trigger a reload.** After saving an audit, update that case locally rather than re-fetching the whole queue.

4. **Quiet arrival of new records.** New cases that land while you are working appear in the list normally, but the tab badges and row order stay stable — no auto-jump between tabs.

5. **Manual refresh button.** A refresh icon in the QA Operations header runs the full loader on demand (with a spinning state), for when someone wants a guaranteed-fresh pull.

## Technical notes

- File: `src/components/admin/QAOperationsQueue.tsx`.
- Replace the blanket `fetchCasesRef.current()` in the `qa-cases-live` channel handler with an `applyRealtimeEvent(payload)` that switches on `eventType` and calls `setCases` with a mapped/filtered/prepended array. Respect `visibleAlertTypes` (drop events for alert types the user can't see) and the completed-90-day window.
- Add a `refreshing` state distinct from `loading`; gate the `{loading ? spinner : table}` branch on `cases.length === 0 && loading` so background pulls don't unmount the table.
- Keep the existing scope effect (`tab === 'completed' || 'all'`, date filters) doing a full fetch, but mark it as `refreshing` rather than `loading`.
- Enrich a single inserted row with one `all_appointments` select on its `appointment_id`.
- No database, RLS, or edge function changes.
