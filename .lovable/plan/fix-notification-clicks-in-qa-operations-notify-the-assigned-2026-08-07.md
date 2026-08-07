# Fix notification clicks in QA Operations + notify the assigned QA on ticket resolution

## 1. Clicking a notification does nothing while already on QA Operations

The QA Operations screen handles the notification deep link once per case id and never resets that guard. If you are already sitting on the QA Operations tab (the screen stays mounted), clicking the same notification again — or clicking one after the drawer was closed — is ignored, so nothing opens.

Fixes:
- Reset the "already handled" guard when the case drawer is closed, and key it on the full link (case + note) so repeat clicks always reopen the record.
- Add a unique marker to the link the bell generates so every click is a distinct navigation, even to the same record.
- When the linked record is not in the currently selected status tab (for example a Completed record while the New tab is active), switch the queue to All so the row is visible behind the drawer, and clear any active filters that would hide it.
- If the record is loaded directly (not already in the list), still open the drawer and scroll to the referenced note.

## 2. Notify the assigned QA when a Control Hub ticket is resolved

Today, ticket notifications only go out when the record was escalated, and only to the escalation owner / escalator. The QA specialist assigned to the patient record gets nothing, even though the resolution auto-moves their audit to Completed.

Fixes:
- Include the assigned QA specialist on the record in the notification recipients for every ticket event.
- Send notifications for ticket events on non-escalated records too (currently skipped entirely).
- On resolution, send a clear message: ticket resolved and the audit record moved to Completed, with the patient and clinic named, deep-linking to the record.
- De-duplicate recipients so an assignee who is also the escalation owner gets one notification.

## Technical notes

- `src/components/admin/QAOperationsQueue.tsx`: rework the `?qaCase=&note=` effect — guard key becomes `caseId:noteId:nonce`, reset `handledDeepLinkRef` on drawer close, force `statusTab` to `all` and clear clinic/alert/assignment/date filters when the target case is not in the filtered list.
- `src/components/notifications/MentionsBell.tsx`: append a nonce param (`&n=<notification id>`) to the navigate target.
- `supabase/functions/controlhub-ticket-webhook/index.ts`: add `assigned_qs_user_id` to the `qa_cases` select and to the notification target set; remove the `if (qaCase.escalated_at)` gate; use `kind: 'case_status'` with title "Ticket <id> resolved — audit completed" when `isResolved`, otherwise keep `ticket_update`.
- No schema changes.
