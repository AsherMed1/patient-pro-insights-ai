## Auto-transition QA cases to "In Review" on open

When a QA user opens a case from the **New** queue, automatically flip its `workflow_status` to `in_review` and stamp `review_started_at` — no manual selection required.

### Change

In `src/components/admin/QAOperationsQueue.tsx`, when a row/eye button click sets `selectedCase`:

- If the opened case has `workflow_status === 'new'`, call the existing status-change handler (which already sets `workflow_status = 'in_review'` and `review_started_at = now()` — see line 233–234).
- Only auto-transition from `new`. Do not touch `pending_escalated`, `completed`, or `reopened` (reopening remains a deliberate action, and re-opening an already-in-review case must not reset `review_started_at`).
- Update local state optimistically so the modal reflects the new status immediately.

### Not changing

- QA still manually moves cases to Pending/Escalated, Completed, etc.
- Existing "In Review" filter, counts, and DB schema (`review_started_at` column already exists).
- ControlHub ticket flow, notes, activity log.

### Verification

- Open a `new` case → row status updates to In Review, `review_started_at` populated in DB.
- Open an already `in_review` case → no change to `review_started_at`.
- Open a `completed`/`pending_escalated` case → status unchanged.