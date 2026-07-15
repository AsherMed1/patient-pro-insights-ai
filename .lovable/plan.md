## Goal
Build a centralized **QA Operations Queue** in the PatientPro Portal that consolidates the alerts Quality Specialists (QS) currently monitor across per-clinic Slack channels into one workspace with workflow states, assignment, notes, timing metrics, and ControlHub ticket integration.

Modeled after the existing Review Queue (`src/components/admin/ReviewQueue.tsx`) so the UX and role-gating patterns match what admins already know.

## Scope of alerts (Phase 1 — "Mirror current Slack alerts")

A QA case is auto-generated for these appointment events, matching the events that currently fire Slack alerts:

1. **Short-notice bookings** — any row inserted into `short_notice_alerts`.
2. **OON transitions** — `status` set to `OON` on `all_appointments` (already routed via `notify-slack-oon`).
3. **Cancellations / No Shows** — `status` transitions into `Cancelled` / `No Show` after the appt was previously Confirmed.

Not in Phase 1: reschedules, generic new-appt notifications, insurance changes. (Easy to extend once the shell exists.)

## Access model

- New app role: **`qa_specialist`**
  - Stripped `Index` layout (similar to `review_only`) showing only the QA Operations Queue tab.
  - Cannot access other admin surfaces.
- Admins + agents (`hasManagementAccess`) also see the QA Queue tab alongside the existing Review Queue tab, for oversight.
- QS-to-clinic scoping: **reuse `project_user_access`** — a QA specialist only sees cases for projects they're assigned to. Admins/agents see all. This avoids introducing a parallel scope table and matches how project users are already scoped.

## Data model (new tables via migration)

```text
qa_cases
├── id (uuid, pk)
├── appointment_id (fk → all_appointments, nullable)
├── ghl_contact_id (text) — dedup anchor when appointment_id is null
├── project_name (text)
├── patient_name (text)
├── service_line (text)             — procedure_type snapshot
├── appointment_date (timestamptz)
├── appointment_status (text)       — snapshot at case creation, refreshed via trigger
├── alert_type (text)               — short_notice | oon | cancelled | no_show
├── alert_source_id (uuid)          — pointer to short_notice_alerts.id or audit_logs.id
├── workflow_status (text)          — new | in_review | pending_escalated | completed | reopened
├── assigned_qs_user_id (uuid, nullable)
├── entered_queue_at (timestamptz, default now)
├── review_started_at (timestamptz, nullable)
├── completed_at (timestamptz, nullable)
├── completed_by_user_id (uuid, nullable)
├── controlhub_ticket_id (text, nullable)
├── controlhub_ticket_status (text, nullable)  — open | resolved | pending
├── controlhub_ticket_url (text, nullable)
├── last_alert_activity_at (timestamptz)
├── created_at / updated_at

qa_case_activity           — append-only feed per case
├── id, case_id, activity_type, description, metadata jsonb, actor_user_id, created_at

qa_case_notes              — internal QS notes
├── id, case_id, note, author_user_id, created_at
```

**Dedup rule:** unique on `(coalesce(appointment_id::text, ghl_contact_id), alert_type)` where `workflow_status <> 'completed'`. A new alert matching an already-active case appends to `qa_case_activity` and bumps `last_alert_activity_at` instead of creating a new row. When a case is `completed` and a new relevant alert arrives, the case is reopened (`workflow_status='reopened'`, `completed_at` preserved for reporting) — satisfies "return case to active queue if new activity."

**RLS:**
- Admins/agents: full access.
- `qa_specialist`: can select/update cases where `project_name` matches an entry in their `project_user_access`.
- `qa_case_notes` / `qa_case_activity` inherit the parent case's access via a `has_qa_case_access(_case_id)` security-definer function.

## Alert ingestion (triggers + edge function hook)

- **DB trigger `qa_ingest_short_notice`** on `short_notice_alerts` AFTER INSERT → upsert into `qa_cases` with `alert_type='short_notice'`.
- **DB trigger `qa_ingest_terminal_status`** on `all_appointments` AFTER UPDATE OF status →
  - If `NEW.status` = `OON` → upsert case with `alert_type='oon'`.
  - If `NEW.status` in (`Cancelled`, `No Show`) AND `OLD.was_ever_confirmed=true` → upsert case with `alert_type='cancelled'` or `'no_show'`.
  - All upserts hit the dedup key; existing active/reopened rows just append activity.

No changes to existing Slack alert pathways — QA Queue runs in parallel. Slack alerts continue firing; QS gradually shift to the portal.

## UI

**New:** `src/components/admin/qa-queue/QAOperationsQueue.tsx` and subcomponents, alongside `ReviewQueue`. Wired into `src/pages/Index.tsx` with a new `qa-queue` tab (visible to admins/agents), and a stripped layout branch for `qa_specialist` role (mirrors the existing `isReviewOnly()` branch).

Tabs within the queue: **New · In Review · Pending/Escalated · Completed** (each a filtered view of `qa_cases`).

**Filters:** clinic (project_name), service line, appointment status, alert type, date range (entered_queue_at). Uses the same filter primitives as `AllAppointmentsManager`.

**Row displays:** patient name · clinic · service line · appointment date/time · current appointment status · alert type · latest activity timestamp · assigned QS · ControlHub ticket badge (color-coded by status).

**Row actions:**
- **Open detail drawer** → shows appointment snapshot, activity feed, notes composer, "View in GHL" button (reuses existing `ghl-admin-contact-link` logic), and workflow-status controls.
- **Claim** → sets `assigned_qs_user_id = auth.uid()` and stamps `review_started_at`.
- **Change status** (New → In Review → Pending/Escalated → Completed). Stamps `completed_at` + `completed_by_user_id` on completion.
- **Add note** → writes to `qa_case_notes` and appends to activity feed.
- **Create ControlHub ticket** → opens a modal pre-filled with patient/clinic/service line/appointment id/GHL URL/issue description; on submit, calls a new edge function `create-controlhub-ticket` and stores returned `ticket_id`, `ticket_url`, `ticket_status` back on the case. Before opening, the modal checks `qa_cases` for existing tickets on the same `ghl_contact_id` and warns of potential duplicates.

## ControlHub integration

- New edge function: `supabase/functions/create-controlhub-ticket/index.ts`.
- Reads `CONTROLHUB_API_URL` and `CONTROLHUB_API_KEY` from secrets. Since the user didn't confirm credentials, this ships **as a stub** that:
  - Validates payload and CORS.
  - If the two secrets are present, POSTs to `${CONTROLHUB_API_URL}/tickets` with `Authorization: Bearer …`.
  - If secrets are absent, returns a deterministic placeholder `ticket_id`/`ticket_url` and marks `controlhub_ticket_status='pending_config'`, so the UI works end-to-end and the wiring flips on the moment secrets are added.
- Optional companion function `sync-controlhub-ticket-status` (stubbed) refreshes ticket status on the case; wired to a poll on drawer open.

## Metrics (foundation for QS performance)

Timestamps stored per case (`entered_queue_at`, `review_started_at`, `completed_at`, `completed_by_user_id`, `assigned_qs_user_id`) plus the activity feed are enough for future reporting; no dashboard in this phase — a `qa_case_metrics` view is added so a later Reporting tab can plug in without schema changes.

## Out of scope for this phase

- Reschedule / new-appointment / insurance-change alert types (add later by extending the ingestion triggers).
- Team-wide QS performance dashboard UI.
- Bulk actions across cases.
- Auto round-robin assignment (QS self-claim only).
- Real ControlHub API wiring beyond the stub — flips on when credentials land.

## Files to add / touch

New:
- `supabase/migrations/<timestamp>_qa_operations_queue.sql`
- `supabase/functions/create-controlhub-ticket/index.ts`
- `supabase/functions/sync-controlhub-ticket-status/index.ts` (stub)
- `src/components/admin/qa-queue/QAOperationsQueue.tsx`
- `src/components/admin/qa-queue/QACaseDrawer.tsx`
- `src/components/admin/qa-queue/QAControlHubTicketModal.tsx`
- `src/components/admin/qa-queue/QACaseFilters.tsx`
- `src/hooks/useQACases.tsx`

Touch:
- `src/pages/Index.tsx` — new tab + `qa_specialist` role branch.
- `src/hooks/useRole.tsx` — add `qa_specialist` role.
- `src/integrations/supabase/types.ts` — regenerated after migration.

## Secrets to request (after plan approval)

- `CONTROLHUB_API_URL`
- `CONTROLHUB_API_KEY`

Both optional at deploy time; the edge function degrades to stub mode if missing so nothing blocks on ControlHub team turnaround.
