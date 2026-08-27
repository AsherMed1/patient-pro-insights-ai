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


History preservation (non-negotiable): completing or re-alerting a case must never erase history.
- `qa_upsert_case` re-alert branch keeps `resolution_type` (Escalation Type), `date_resolved`, `escalation_status`, owner/escalator/escalated_at, and writes `realerted` + `cycle_snapshot` activity rows describing the closed cycle.
- `qa_cases_escalation_status_sync` no longer rewrites a Resolved escalation to "Follow-Up Required" on reopen; the drawer shows a "Previously resolved" badge when a non-completed case still carries `escalation_status='Resolved'`.
- The drawer renders a collapsible read-only "History for this patient" section aggregating `qa_case_notes` + `qa_case_activity` from sibling cases (same patient/appointment grouping), and surfaces a sibling's ControlHub ticket as a linked-ticket reference when the current case has none.
- Only the explicit per-note delete button removes notes; nothing deletes notes/mentions/activity on completion.

Date-range basis: QA Operations queue and QA Reports (Case Metrics) filter by `qa_cases.appointment_created_at` — when the patient record was created (from `all_appointments.date_appointment_created`, populated by the `trg_qa_cases_set_appointment_created` trigger, falling back to `first_entered_at`/`entered_queue_at`). Filtering is applied per patient GROUP, not per alert: if any of a patient's cases was created in range, the whole group renders with all of its alerts and its current status, including alerts raised after the range. The Specialist Activity report still filters by when actions happened.

## Audit details are appointment-scoped, not alert-scoped
Each alert type opens its own `qa_cases` row for the same appointment, so a new alert (e.g. `confirmed_audit`) used to open with a blank Audit Details section and looked like saved audit work had been erased. `qa_upsert_case` now copies `qa_name`, `self_booked`, `error_category`, `error_source`, `caught_before_clinic`, `resolution_type` from the newest audited sibling row when creating a new case, logging an `audit_inherited` activity entry. The drawer also shows a "Copy into this record" banner when a sibling holds audit and the open case doesn't. `audit_update` activity metadata records per-field before/after values. Never treat a blank sibling row as data loss — check siblings first.

## QA Hold bucket (Potential OON) lives in QA Operations
Records with an unresolved Potential OON flag (`all_appointments.potential_oon` set, `potential_oon_resolved_at` null) appear in a virtual "QA Hold" tab in `QAOperationsQueue.tsx` (bucket is driven by the appointment flag, not `workflow_status`). The drawer shows a Potential OON panel with **Verified in network** (approves the appointment + `approved` GHL tag) and **Confirm OON** (status OON, `appointment-oon` + `oon pt` tags, Slack + status webhook, no GHL cancellation). Shared side effects live in `src/lib/reviewActions.ts` and mirror ReviewQueue exactly. Neither outcome completes the audit — the case stays open for audit fields, notes, escalation and tickets until the specialist clicks Complete, and every action writes a `potential_oon_resolved` row to `qa_case_activity`. `qa_ingest_terminal_status` skips opening/reopening a separate `oon` case when a `potential_oon` case for the same appointment is open or was completed within 7 days (this is what previously bounced completed records back to New).
