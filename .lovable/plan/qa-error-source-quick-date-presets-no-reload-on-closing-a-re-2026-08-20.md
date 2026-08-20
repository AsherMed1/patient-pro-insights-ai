# QA Error Source: quick date presets + no reload on closing a record

## 1. Quick date presets in the report toolbar

Add a preset bar above/next to the existing date pickers in QA Operations → Reports → Error Source, styled like the reference: pill buttons **Today**, **This Week**, **This Month**, a divider, then the two date pickers showing the selected range (e.g. `Aug 01 → Aug 31`).

- Clicking a preset sets the From/To range and highlights the active pill.
- Picking a custom date in either picker clears the active preset highlight.
- Presets use the same local-day boundaries the report already applies (start of day → end of day).

## 2. Closing a record returns you exactly where you were

Today, closing the case drawer triggers a full report re-fetch, which shows the loading state, collapses the expanded source, and drops you back at the top of the page — that's the "page refresh" in the video.

New behavior:

- Closing the drawer no longer blocks the UI. The report stays rendered with all current data.
- Your expanded source group, scroll position, date range, clinic/QA/category/alert filters, search text, and sorting are all preserved.
- Data still stays fresh: after closing, the report refreshes silently in the background (no spinner, no unmount), so counts update in place.
- Same treatment for the QA Operations Queue drawer: closing a case does a background refresh instead of a blocking reload, so the table, bucket tab, filters, and scroll stay put.

## Technical notes

- `QAErrorSourceReport.tsx`: add a `preset` state (`today | week | month | custom`) plus preset pill buttons; `fetchRows` gains a `{ background?: boolean }` option that skips `setLoading(true)`; the `QACaseDrawerStandalone` `onClose` calls `fetchRows({ background: true })` instead of the blocking `fetchRows()`.
- Keep the `expanded` group state untouched on close (it already is) — the loss came from the loading branch replacing the table; the background fetch avoids that.
- `QAOperationsQueue.tsx`: the queue's drawer `onRefresh`/close path already has `fetchCases({ background: true })`; verify the close handler doesn't also reset tab/filters, and preserve `sortKey`/`sortDir`.
- No database or backend changes.
