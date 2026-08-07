# QA Operations: Centralized Escalation Workflow

Escalations currently live half in QA Operations and half in Slack/Control Hub/manual trackers. This adds ownership, a separate escalation status, a dedicated worklist, notifications, and reporting — all inside QA Operations.

## 1. Rename Resolution Type to Escalation Type

The field keeps the same five options (Resolved by QA, Escalated to Tech, Escalated to AM, Escalated to Gloria, Other) and the same stored data — only the label changes, everywhere it appears: case drawer, queue column header, Reports breakdowns, and exports.

## 2. Escalation assignment

Selecting an "Escalated to ..." type and saving the audit will:

- Assign the case to the escalation owner. Escalated to Gloria assigns to Gloria G (gloria.g@patientpromarketing.com). Escalated to Tech / AM assign to a configurable owner (defaults to unassigned until an owner is picked, with a person picker in the drawer so any escalation can be routed).
- Set Workflow Status to Pending / Escalated.
- Set Escalation Status to Awaiting Review.
- Record escalated_by (current user) and escalated_at.
- Notify the assignee in the existing notification bell, linking straight to that patient record.
- Log an activity entry ("Escalated to Gloria by <name>").

## 3. Escalation Status

New field shown next to Workflow Status in the drawer and as a queue column: Awaiting Review, Awaiting Clinic Response, Follow-Up Required, Response Received, Resolved. It is independent of Workflow Status, with two automatic rules:

- Workflow Status → Completed sets Escalation Status → Resolved.
- A completed record Reopened sets Escalation Status → Follow-Up Required and it returns to the escalation worklist.

Changing Escalation Status manually notifies the assignee and the escalator, and writes an activity row.

## 4. Escalation worklist

A new "Escalations" view toggle in the QA Operations header (next to Reports), showing only escalated cases with columns: patient, clinic, alert type, escalation type, workflow status, escalation status, assigned owner, escalated by, date escalated, latest note, linked Control Hub ticket + status, and days outstanding (aging highlighted amber past 3 days, red past 7). Filters: owner (defaults to "Mine" for non-admins), clinic, escalation type, escalation status. Rows open the same case drawer. CSV export included.

## 5. Notes and notifications

@mentions in notes already work. The notification bell is extended to also deliver: assignment/escalation to you, escalation status changes, Control Hub ticket updates on cases you own or escalated, and case completion/reopening. Every notification deep-links to the patient record (and to the specific note for mention/comment events), matching today's mention behavior.

## 6. Activity and reporting

Every assignment change, mention, escalation status change, ticket update, completion, reopen, and resolution date is written to the case activity timeline. The QA Reports tab gains an Escalations section: volume by owner / clinic / escalation type / escalation status, outstanding age buckets, and average resolution time (escalated_at → resolved), with Excel/CSV export alongside the existing sheets.

## Technical notes

- Migration on `qa_cases`: add `escalation_status` (text, nullable), `escalated_by_user_id` (uuid), `escalated_at` (timestamptz), `escalation_owner_user_id` (uuid). Keep `resolution_type` as the stored column for Escalation Type (label-only rename, no data migration). Index on `(escalation_status, escalation_owner_user_id)`.
- DB trigger on `qa_cases`: completed → `escalation_status = 'Resolved'` + `date_resolved`; reopened from completed → `escalation_status = 'Follow-Up Required'`.
- Notifications: generalize `qa_note_mentions` into a notification feed by adding a `kind` column (`mention` | `assignment` | `escalation_status` | `ticket_update` | `case_status`) with nullable `note_id`, so `useQAMentions`/`MentionsBell` render all types with one unread counter. `controlhub-ticket-webhook` inserts `ticket_update` rows for the case owner/escalator.
- Frontend: `QAOperationsQueue.tsx` (rename label, escalation fields in drawer, save-time escalation side effects, new column), new `src/components/admin/QAEscalationWorklist.tsx`, `QAReports.tsx` escalation section, `MentionsBell.tsx` + `useQAMentions.tsx` for multi-kind notifications.
- Gloria currently holds the `va` role, which already has QA Operations access — no role change needed.
