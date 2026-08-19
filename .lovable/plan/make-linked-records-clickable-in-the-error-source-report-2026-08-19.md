# Make Linked Records clickable in the Error Source report

## What changes
In QA Reports → Errors by source, each row inside the expanded "Linked records" table becomes clickable. Clicking a row opens that QA case directly in the QA Operations Queue, with the case drawer already open — the same behavior as clicking a mention notification.

Details:
- The whole row is clickable (cursor pointer, hover highlight), except the Links column, where the existing "Record" and "Ticket" external links keep working on their own.
- Rows are keyboard accessible (Enter/Space) for accessibility.

## Technical notes
- `QAOperationsQueue.tsx` already supports the deep link `?tab=qa-queue&qaCase=<case id>` (used by `MentionsBell.tsx`), which fetches the case if needed and opens its drawer.
- In `src/components/admin/QAErrorSourceReport.tsx`, add `useNavigate` and an `openCase(id)` handler that navigates to `/?tab=qa-queue&qaCase=${id}&n=${Date.now()}` (nonce so repeat clicks re-trigger the effect).
- Attach `onClick` / `onKeyDown` to the `TableRow` for each linked record; add `e.stopPropagation()` on the anchors in the Links cell.
- No database or backend changes.
