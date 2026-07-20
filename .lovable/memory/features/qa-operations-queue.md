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
- Cancelled / No Show (post-confirmation) are NO LONGER in the daily queue. They log to `qa_metrics_events` only, for reporting/trend analysis.

Dedup key: (appointment_id OR ghl_contact_id, alert_type) for non-completed cases. A repeat alert on a completed case reopens it.

`qa_cases` audit fields (mirror the QA error spreadsheet):
qa_name, self_booked, patient_link (derived), error_category (9 allowed values), error_source, caught_before_clinic, resolution_type (Resolved by QA | Escalated to AM | Other), date_resolved (auto-set on completion), ticket_created (auto-derived from `controlhub_ticket_id`).

UI filters: clinic, alert type, assignment (mine/unassigned/all), entered-queue date range, plus free-text search across patient/project/service/error source/error category.

`qa_specialist` app_role. Scoped to clinics via `project_user_access`. Stripped Index.tsx layout for that role. Admin/agent get a "QA Operations" tab.

ControlHub tickets: `create-controlhub-ticket` edge function. Real API when `CONTROLHUB_API_KEY` and `CONTROLHUB_BASE_URL` secrets are set; otherwise records `STUB-<ts>` id so workflow is unblocked.
