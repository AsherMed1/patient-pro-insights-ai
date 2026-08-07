# Freeze the QA Operations column headers too

## Goal
Keep the table's column header row (Patient, Clinic, Service, Alerts, … Ticket) — the row boxed in red — pinned along with the header, tab bar, title and filter strip, so the sortable column labels stay usable while scrolling the queue.

## What changes
- The column header row sticks directly beneath the filter/status-tab block instead of scrolling away.
- The two pinned columns (Patient on the left, the Open button on the right) keep working; their header cells stay pinned in both directions.
- Header row gets a solid background and bottom border so rows scroll cleanly underneath it.

## Technical notes
- Publish the filter/tab strip height as a new CSS variable (`--qa-filters-h`) using the existing `useStickyHeight` hook, alongside `--qa-title-h`.
- Make `TableHeader`'s row cells `sticky` with `top: calc(var(--portal-header-h) + var(--portal-nav-h) + var(--qa-title-h) + var(--qa-filters-h))`, applied on the `th` cells (sticky on `<thead>` does not work reliably inside a scroll container).
- Raise the header cells' z-index above the body's sticky first/last columns (header z-[3], corner cells z-[4]) but keep them under the filter block (z-20).
- The table wrapper at `src/components/admin/QAOperationsQueue.tsx:1137` uses `overflow-x-auto`; keep it that way — no vertical overflow container, so page-level sticky continues to work.

Files: `src/components/admin/QAOperationsQueue.tsx` (filter block ref, `SortableHead` className, right-side spacer head).

## Validation
Scroll the queue: header, nav, title, filters and the column header row all remain visible; sorting arrows stay clickable and the Patient/Open columns stay aligned during horizontal scroll.
