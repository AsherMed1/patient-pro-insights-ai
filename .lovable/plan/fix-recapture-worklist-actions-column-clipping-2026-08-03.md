# Fix Recapture Worklist Actions Column Clipping

## What we’re fixing
In `RecaptureQueue.tsx`, the rightmost **Actions** column is cut off (header shows "Ac…", buttons wrap or clip). The table wrapper has `overflow-x-auto`, but the Actions cell lacks a minimum width, so the browser truncates it before scrolling.

## Changes
1. **Pin the Actions column width**
   - Add `whitespace-nowrap` and a `min-w-[200px]` (or equivalent) class to the **Actions** `<TableHead>` and `<TableCell>`.
   - This forces the browser to reserve enough width for the buttons and triggers horizontal scrolling only when necessary.

2. **Keep buttons on one line**
   - The existing `flex items-center justify-end gap-2` layout is correct; ensure it never wraps (`flex-nowrap`).
   - If horizontal space is still tight on smaller screens, switch the two primary buttons to compact sizes (`size="sm"` already applied) or use icon-only buttons with tooltips as a fallback.

3. **Verify overflow behavior**
   - Confirm the parent `rounded-md border overflow-x-auto` container still wraps the table and shows a horizontal scrollbar when content exceeds viewport width.
   - Ensure the right edge of the Actions column is fully visible after the fix, not clipped by the container.

## Files to edit
- `src/components/recapture/RecaptureQueue.tsx`

## Validation
- Open the Recapture Worklist in the preview.
- Confirm the **Actions** header reads fully as "Actions".
- Confirm **Log Attempt**, **Complete**, and the **More** (⋯) menu are visible on a single line for each row.
- Resize the browser narrower and confirm horizontal scrolling appears before any column is clipped.
