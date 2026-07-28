---
name: QA Operations Queue
description: Centralized workspace for Quality Specialists to audit confirmed appointments and review OON / short-notice alerts, capture error-sheet fields (QA name, self-booked, error category/source, resolution, caught-before-clinic), take notes, and open ControlHub tickets.
type: feature
---

Workflow statuses: new, in_review, pending_escalated, completed, reopened.

Ingestion (DB triggers):
- `short_notice_alerts` INSERT → `short_notice` case
- `all_appointments.status` UPDATE to OON → `oon` case
- `all_appointments.status` UPDATE to Confirmed → `confirmed_audit` case (routine auditing of every confirmed appointment)
- `all_appointments.review_status` = 'pending' (insert or transition into pending) → `review_queue` case. On approve → alert flips to `confirmed_audit`; on OON → flips to `oon`; on declined/dismissed → case completed with resolution "Declined in Review Queue". `review_entered_at` / `review_resolved_at` timestamps capture how long the appointment sat in Review Queue. Reviewer name (profiles.full_name) recorded in qa_case_activity.
- `all_appointments.status` UPDATE to Cancelled/Canceled → `cancelled` case; to No Show → `no_show` case. Fires on EVERY such transition (no `was_ever_confirmed` requirement). These are hidden by default: only admins and Kathryn Meksavanh (`kathryn.m@patientpromarketing.com`) get a "No-Show / Cancellations" toggle plus matching Alert Type options; everyone else never loads them. Badges use amber (No-Show) / rose (Cancellation) to stand apart. `qa_metrics_events` logging is unchanged and still gated on `was_ever_confirmed`.

Dedup key: (appointment_id OR ghl_contact_id, alert_type) for non-completed cases. A repeat alert on a completed case reopens it.

`qa_cases` audit fields (mirror the QA error spreadsheet):
qa_name, self_booked, patient_link (derived), error_category (9 allowed values), error_source, caught_before_clinic, resolution_type (Resolved by QA | Escalated to AM | Other), date_resolved (auto-set on completion), ticket_created (auto-derived from `controlhub_ticket_id`).

UI filters: clinic, alert type, assignment (mine/unassigned/all), entered-queue date range, plus free-text search across patient/project/service/error source/error category.

`qa_specialist` app_role. Scoped to clinics via `project_user_access`. Stripped Index.tsx layout for that role. Admin/agent get a "QA Operations" tab.

ControlHub tickets: `create-controlhub-ticket` edge function. Real API when `CONTROLHUB_API_KEY` and `CONTROLHUB_BASE_URL` secrets are set; otherwise records `STUB-<ts>` id so workflow is unblocked.

Reports (admin only): a "Reports" toggle in the QA Operations header renders `QAReports.tsx` — manager view over `qa_cases` with date range + clinic/QA/alert/category filters, summary cards (audits, errors, error rate, avg turnaround, caught-before-clinic, tickets), breakdowns by clinic / QA specialist / error category / error source / resolution, a weekly errors chart, and Excel (multi-sheet + Raw Cases) / CSV export. Turnaround = coalesce(date_resolved, completed_at) − coalesce(first_entered_at, entered_queue_at). Non-admins never see the toggle.

