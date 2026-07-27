## Goal
Change the QA Operations Queue so the audit record (CaseDrawer) opens only when the user clicks the **Open** button in a row. Clicking anywhere else on the row should not open the record, allowing users to select and copy queue data without triggering the drawer.

## Current State
In `src/components/admin/QAOperationsQueue.tsx`, the entire `TableRow` has `className="cursor-pointer"` and an `onClick={() => openGroup(g)}` handler. The last cell contains an **Open** button that also calls `openGroup(g)` and stops propagation. As a result, any click on the row — including text selection — opens the drawer.

## Proposed Change
1. Remove the `onClick` handler from the `TableRow`.
2. Remove the `cursor-pointer` class from the `TableRow`.
3. Keep the existing **Open** button as the sole trigger for `openGroup(g)`.
4. Retain `e.stopPropagation()` on the GHL link and ticket link so they continue to work independently.

## Verification
- Build the project to confirm no TypeScript errors.
- Use Playwright to click a neutral area of a row and confirm the drawer does not open; then click the **Open** button and confirm the drawer opens.

## Files Modified
- `src/components/admin/QAOperationsQueue.tsx`