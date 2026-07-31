# QA Operations Queue: see every column without horizontal scrolling

## Problem

The queue table renders 13 columns inside a horizontally scrolling container. On narrower screens the Open button (last column) is off-screen, so opening a patient record means scrolling to the bottom scrollbar and dragging right.

## What changes

1. **Pin the Open button.** The action column becomes sticky to the right edge of the table container (with a subtle left border/shadow), so Open is always reachable no matter the horizontal scroll position. The Patient column is pinned to the left the same way, so you always know which row you're acting on.

2. **Make the table fit.** Tighten the layout so all columns fit on a normal desktop width instead of overflowing:
   - Reduce cell padding and font size for the dense data columns.
   - Give each column a sensible width: short columns (Self-Booked, Resolved, Ticket) get narrow fixed widths; Patient / Clinic / Service / Error Source wrap instead of forcing width.
   - Shorten date rendering (e.g. "Jul 24, 6:58 PM" stays, but the column no longer forces extra width).
   - Header labels get compact wording where safe (Self-Booked, Error Source, Date Created, Latest Alert stay readable but wrap onto two lines rather than widening the column).

3. **Column visibility control.** Add a "Columns" dropdown in the queue header letting users hide columns they don't use (Self-Booked, Error, Error Source, Resolution, Resolved, Ticket). Choices persist in local storage per user. Patient, Clinic, Alerts and the Open action are always visible.

4. **Full-width container.** Let the queue table use the full available page width rather than a constrained content column, so the extra room is actually used on wide monitors.

Horizontal scrolling still exists as a fallback on small screens, but with Patient and Open pinned it is no longer needed to open a record.

## Technical notes

- File: `src/components/admin/QAOperationsQueue.tsx`.
- Sticky columns: `sticky left-0` / `sticky right-0` with `bg-background` and `z-10` on both `TableHead` and `TableCell` for the first and last columns; add a border to signal the pinned edge. Sticky positioning works inside the existing `overflow-x-auto` wrapper.
- Density: add `className="text-xs"`/`py-2 px-2` to the table, and `w-[...]`/`whitespace-normal` per column via the `SortableHead` component (extend it with an optional `className`/`width` prop).
- Column visibility: a `visibleColumns` state (Set of SortKey) seeded from `localStorage` key `qa-queue-columns`, rendered through a `DropdownMenu` with `DropdownMenuCheckboxItem`; both header and body cells check membership before rendering.
- No database, edge function, or data-fetching changes. Sorting, grouping, filters and the drawer behave exactly as today.
