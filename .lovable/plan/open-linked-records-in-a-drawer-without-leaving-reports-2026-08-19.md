# Open linked records in a drawer without leaving Reports

## What changes

Clicking a row in the "Linked records" table of the Error Source report no longer navigates to the QA Operations Queue. Instead, the same QA case drawer slides open on top of the Reports view, with the report and its filters untouched behind it. Closing the drawer returns you exactly where you were, with the source row still expanded.

Inside the drawer you get the full case experience you already know from the queue: audit details, workflow/escalation status changes, notes, attachments and ticket actions. Saving a change refreshes just that record; the report's numbers refresh in the background so counts stay accurate.

## Technical notes

- `CaseDrawer` currently lives inside `src/components/admin/QAOperationsQueue.tsx` as a private component. Export it (keep it in the same file, add `export function CaseDrawer`) so it can be reused; no behavior change for the queue.
- In `src/components/admin/QAErrorSourceReport.tsx`:
  - Remove `useNavigate` / `openCase` navigation.
  - Add local state `selectedCase: QACase | null`; row click fetches the full `qa_cases` row by id (the report only holds a subset of columns) and sets it.
  - Load the supporting lists the drawer needs (`errorSources`, `errorCategories`) the same way the queue does, plus `actorName` from the existing user-attribution hook.
  - Pass `siblings={[]}` and a no-op `onSwitchCase` (sibling switching is queue-specific), `onClose` clears the selection, `onRefresh` re-runs the report's existing fetch in background mode.
  - Keep `e.stopPropagation()` on the Record/Ticket external links so they still open in a new tab.
- No database, RLS, or edge-function changes.
