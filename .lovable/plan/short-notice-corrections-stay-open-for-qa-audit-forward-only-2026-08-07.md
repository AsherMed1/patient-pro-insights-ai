# Short-Notice corrections stay open for QA audit (forward-only)

## Decision

Records that were already auto-completed by the earlier behavior stay as they are. No backfill, no reopening of historical cases. The new behavior applies only to reschedules from now on.

## Behavior going forward

When a short-notice appointment is rescheduled outside the clinic's short-notice window:

- The short-notice alert is marked resolved, and the QA record is stamped as "short-notice corrected".
- The QA record does NOT auto-complete. It stays in its current status (New / In Review) so a QA still audits it.
- A history entry is added noting the appointment moved outside the window and the record remains open for audit.
- In the QA Operations queue the red "Short-Notice" badge is replaced by a muted "Short-Notice (corrected)" chip, with a tooltip explaining the appointment was rescheduled out of the window.
- If the new time is still inside the window, nothing changes: the alert stays open and its hours figure is refreshed.

## Technical details

Already in place:

- `qa_cases.short_notice_cleared_at` column added.
- `public.qa_resolve_short_notice_on_reschedule()` redeployed: clears the alert and sets `short_notice_cleared_at`, logs a `qa_case_activity` entry, and no longer sets `workflow_status = 'completed'`.
- `QAOperationsQueue.tsx`: `QACase` type carries `short_notice_cleared_at`; grouping computes `shortNoticeCorrected`; badge renders the muted corrected chip; the two detail-drawer short-notice checks exclude cleared cases.

Remaining: nothing. The only outstanding item was the backfill of previously auto-completed cases, which is now dropped per this decision.
