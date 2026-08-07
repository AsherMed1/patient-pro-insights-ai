# Escalation "Resolved" should close the audit record

## What's happening

Setting **Escalation status = Resolved** only writes that one field. Nothing moves the record's **Workflow status**, so it stays in the **Pending / Escalated** bucket. The existing database sync only works in one direction: marking the workflow Completed forces the escalation to Resolved — never the reverse.

Confirmed in the code: the escalation dropdown handler patches only `escalation_status`, and the bucket tabs filter purely on `workflow_status`.

## The fix

When escalation status is set to **Resolved**:
- Also move the record's workflow status to **Completed** (stamping the completion date), so it leaves Pending / Escalated and lands in the Completed tab.
- Log the change in the case activity timeline as an escalation-driven completion.
- Notify the assigned QA specialist, escalation owner, and the person who escalated, via the bell icon.

When escalation status is moved off Resolved to any open state (Awaiting Review, Awaiting Clinic Response, Follow-Up Required, Response Received) on a record currently Completed:
- Reopen it back to **Pending / Escalated** so it returns to the working bucket.

Both directions get the same treatment in the Escalations worklist so the two views stay in agreement.

## Technical notes

- `updateEscalationStatus` in `src/components/admin/QAOperationsQueue.tsx`: extend the patch — `next === 'Resolved'` adds `workflow_status: 'completed'`, `completed_at`, `date_resolved`; a non-Resolved value on an already-completed case sets `workflow_status: 'pending_escalated'` and clears `completed_at`. Keep the optimistic local state update in sync so the row moves tabs immediately.
- Database trigger `public.qa_cases_escalation_status_sync()`: add the mirrored branch so any writer (worklist, webhook, direct update) gets the same behavior — `NEW.escalation_status = 'Resolved'` and `OLD.escalation_status` distinct from it promotes `workflow_status` to `completed`. This is a migration.
- Activity row: `qa_case_activity` with `activity_type: 'status_change'` describing "Completed via escalation resolution".
- Notification: reuse `notifyQAUsers` with kind `case_status`, adding `assigned_qs_user_id` to the target list alongside owner and escalator.
