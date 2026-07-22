## Problem

In the QA Operations drawer, changing **Workflow status** to "Completed" (or any value) doesn't visibly update until the user refreshes. The DB write succeeds, but the drawer keeps showing the old status.

## Root cause

`updateStatus` writes to Supabase, then calls `fetchCases()` which refreshes the `cases` list. However the drawer renders from a separate `selectedCase` state object, which is never updated after the write. The realtime subscription on `qa_cases` also only re-runs `fetchCases()` — it doesn't touch `selectedCase`. So the Select stays bound to the stale value until the user closes/reopens the drawer (which reads fresh data from `cases`).

The same pattern already works correctly in `openCase` for the New → In Review auto-transition because it optimistically calls `setSelectedCase({ ...c, workflow_status: 'in_review' })` before the DB write.

## Fix (UI only, `src/components/admin/QAOperationsQueue.tsx`)

1. In `updateStatus`, optimistically patch `selectedCase` (and any matching sibling) with the new `workflow_status` and the timestamp fields it sets (`review_started_at`, `completed_at`, `completed_by_user_id`) before/alongside the Supabase write, so the drawer's Select reflects the change instantly.
2. Add a small effect that keeps `selectedCase` in sync with the latest `cases` list — when realtime fires `fetchCases()` (e.g. another user updates the same case), the open drawer picks up the fresh row by id instead of showing stale data.
3. On write failure, revert the optimistic patch and show the existing error toast.

No schema, trigger, or realtime-publication changes — realtime is already subscribed to `qa_cases`; the missing piece is reflecting updates in the drawer's local state.

## Verification

- Open a case, change status to Completed → dropdown and header chip update immediately, no refresh needed.
- With the drawer open, update the same case from another browser tab → the open drawer reflects the new status within ~1s via the existing realtime channel.
