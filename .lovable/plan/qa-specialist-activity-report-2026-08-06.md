# QA Specialist Activity Report

Add a second report view inside QA Operations → Reports: **Specialist Activity**, driven by the action log (`qa_case_activity`) rather than by case creation dates. Managers pick a date range *and* a time-of-day window (e.g. Aug 5, 10:00–11:00) and see per-specialist productivity plus a full audit log.

## Filters

- Date from / date to (existing calendar pickers, plus quick presets: Today, Yesterday, This week, Last 7 days).
- Start time / end time of day (HH:MM inputs, default 00:00–23:59). Applied to every day in the range, so "Aug 1–5, 10:00–11:00" returns the 10–11am hour on each of those days.
- Clinic, QA specialist, alert type, action type.
- All times shown and filtered in Central Time, matching the rest of the portal.

## Summary table (one row per QA specialist)

- Unique alerts opened (distinct case IDs — reopening the same alert repeatedly counts once)
- Alerts claimed / assigned
- Alerts completed
- Alerts reopened
- Tickets created
- Alerts still being worked (opened by them and not yet completed at the end of the window)
- Average time from open to completion (first open → completion, per alert)
- First activity time and last activity time in the window

Totals row across all specialists, plus small cards for range-wide totals.

## Detailed activity log

One row per action, newest first, paginated:

Date/time (CT) · QA specialist · Patient (links to the patient record) · Clinic · Alert type · Action (Opened, Claimed, Completed, Reopened, Ticket Created, Audit Updated, Escalated) · Current completion status · Time from open to completion for that alert.

Export: Excel workbook with a Summary sheet and a Detailed Log sheet, plus CSV of the log.

## Action mapping

Actions are derived from existing `qa_case_activity` rows so history back to today is already reportable:

| Action | Source |
| --- | --- |
| Opened | `status_change` → "Opened" (in_review) |
| Completed | `status_change` → "Completed" |
| Reopened | `status_change` → "Reopened", and any Opened that follows a Completed on the same case |
| Escalated | `status_change` → "Pending / Escalated" |
| Ticket Created | `ticket_created` |
| Audit Updated | `audit_update` |

`created` / `alert_repeat` / `realerted` rows are system ingestion events, not specialist actions — they stay out of the summary and are hidden in the log by default.

**Claimed** is not currently logged. The queue writes `assigned_qs_user_id` on `qa_cases` without an activity row, so claim counts would be empty. The plan adds an `assignment` activity row wherever the queue sets/clears the assignee, so claims are captured from this change forward (historic claims are unavailable).

## Technical notes

- New component `src/components/admin/QAActivityReport.tsx`; `QAReports.tsx` gets a two-way toggle (Case Metrics | Specialist Activity) so the existing report is untouched.
- Data: paginated fetch of `qa_case_activity` filtered on `created_at` between the range bounds, joined in memory to `qa_cases` (project, patient, alert type, workflow status, ticket id) and to `profiles` for specialist names via `actor_user_id`. Time-of-day filtering applied client-side after converting each timestamp to Central Time.
- Admin-only, same gate as the existing Reports toggle.
- Add the missing assignment activity insert in `QAOperationsQueue.tsx` next to the `assigned_qs_user_id` update.
