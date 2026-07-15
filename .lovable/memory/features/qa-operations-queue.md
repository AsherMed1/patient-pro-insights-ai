---
name: QA Operations Queue
description: Centralized workspace for Quality Specialists to review appointment alerts (short-notice, OON, cancelled/no-show after confirmation), take notes, and open ControlHub tickets.
type: feature
---

Workflow statuses: new, in_review, pending_escalated, completed, reopened.

Ingestion is automatic via DB triggers:
- `short_notice_alerts` INSERT → `short_notice` case
- `all_appointments.status` UPDATE to OON → `oon` case
- `all_appointments.status` UPDATE to Cancelled/No Show, only if `was_ever_confirmed=true` → `cancelled` / `no_show` case

Dedup key: (appointment_id OR ghl_contact_id, alert_type) for non-completed cases. A repeat alert on a completed case reopens it.

New `qa_specialist` app_role. Scoped to clinics via `project_user_access`. Stripped Index.tsx layout for that role. Admin/agent get a "QA Operations" tab.

ControlHub tickets: `create-controlhub-ticket` edge function. Real API when `CONTROLHUB_API_KEY` and `CONTROLHUB_BASE_URL` secrets are set; otherwise records `STUB-<ts>` id so workflow is unblocked.
