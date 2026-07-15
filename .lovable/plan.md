## QA Operations Queue

### Goal
Centralized workspace where Quality Specialists review appointment quality alerts (short-notice bookings, OON transitions, and Cancellation / No Show for previously-confirmed appointments), take notes, escalate, and optionally create a ControlHub ticket.

### Data model
- `qa_cases` — one case per (appointment/contact + alert type). Tracks workflow status: `new | in_review | pending_escalated | completed | reopened`.
- `qa_case_activity` — append-only event log per case.
- `qa_case_notes` — internal QA notes per case.
- Dedup: unique index on `(coalesce(appointment_id, ghl_contact_id, id), alert_type) WHERE workflow_status <> 'completed'`.
- Reopen: any new alert activity on a completed case flips it back to `reopened`.

### Ingestion
- Trigger on `short_notice_alerts` insert → opens `short_notice` case.
- Trigger on `all_appointments.status` update → opens `oon`, `cancelled` (was_ever_confirmed), or `no_show` (was_ever_confirmed) case.
- Dedup / reopen handled in `qa_upsert_case()` SQL helper.

### Access
- New `qa_specialist` role, scoped to clinics via existing `project_user_access`.
- RLS: admin/agent see everything; qa_specialist limited to assigned projects.
- QA specialists get a stripped `Index.tsx` layout (Queue only), similar to review_only.
- Admins/agents get an "QA Operations" tab in the main dashboard.

### ControlHub integration
- `create-controlhub-ticket` edge function.
- If `CONTROLHUB_API_KEY` and `CONTROLHUB_BASE_URL` are set, calls the real API.
- Otherwise records a `STUB-<ts>` ticket ID so the workflow works before the API is live.

### Out of scope
- Detailed SLA timers, per-QS assignment UI, and bulk ticket sync — future iterations.
