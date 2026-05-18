
# Admin Review Queue

Every new appointment (from GHL webhook, all-appointments-api, or CSV import) lands in an admin-only review queue. It is hidden from all client project portals until an admin acts on it.

## Admin actions

- **Approve** — releases the appointment to its project portal as normal.
- **Decline** — soft-hides the record; it stays in DB but is filtered out of all client portals and reports.
- **Mark as OON** — sets `status = 'OON'`, releases to portal, fires existing OON Slack alert.

## Data model

Add three columns to `all_appointments`:

- `review_status` text — `pending` (default) | `approved` | `declined` | `oon`
- `reviewed_by` uuid (nullable) — admin who acted
- `reviewed_at` timestamptz (nullable)

New table `appointment_review_history` for an immutable audit trail (appointment_id, action, actor, timestamp, prior_status, notes).

Backfill: every existing row → `review_status = 'approved'` so nothing currently visible disappears.

## Visibility enforcement

Single source of truth = `review_status = 'approved' OR review_status = 'oon'`. Applied in three places:

1. **Client-portal queries** in `AllAppointmentsManager`, dashboard widgets, reporting, calendar, EMR queue, recapture dashboard, exports — add `.in('review_status', ['approved','oon'])`.
2. **RLS policy** on `all_appointments` for the `project_user` role — require approved/oon. Admin/agent/VA bypass.
3. **Edge functions** that surface data to portals (`get_dashboard_data`, `get_project_call_summary`, etc.) get the same filter.

Triggers that fire on insert (auto-parse, insurance fetch queue, EMR queue, short-notice Slack) keep running — review only gates *visibility*, not enrichment. Short-notice Slack will be suppressed until Approved (single guard).

## Ingestion changes

- `ghl-webhook-handler` and `all-appointments-api`: new rows insert with `review_status = 'pending'` (no other change).
- GHL status updates on a still-pending row: update the row but keep `pending`.

## Admin UI

New top-level tab **"Review Queue"** (admin + agent + VA only), pinned next to existing admin tools:

- Counter badge with pending count, polled every 30s.
- Table grouped by project, sorted by `created_at` desc.
- Each row expands inline to show full parsed intake (demographics, insurance, pathology, location, procedure_type, calendar_name, raw notes) — the same `AppointmentCard` detail body, read-only.
- Three action buttons per row: **Approve** (green), **Decline** (red, opens reason textarea), **Mark as OON** (orange, requires confirm).
- Bulk select + bulk Approve / Decline.
- Filters: project, date range, search by name/phone.
- Every action writes an `appointment_review_history` row and an `audit_logs` entry "Approved/Declined/OON'd {lead_name} by {userName}".

## Reporting impact

Declined rows are excluded from every count, conversion %, CPL calc, and export. Admin reports get an optional "Include declined" toggle for QA.

## Files to touch

```text
supabase/migrations/                       (new — columns, RLS, backfill, history table)
supabase/functions/ghl-webhook-handler/    (insert review_status=pending)
supabase/functions/all-appointments-api/   (insert review_status=pending)
supabase/functions/notify-slack-short-notice/  (skip if not approved)
src/components/admin/ReviewQueue.tsx       (new tab + table)
src/components/admin/ReviewQueueRow.tsx    (new expandable row)
src/components/AllAppointmentsManager.tsx  (filter approved/oon)
src/hooks/useCalendarAppointments.tsx      (filter)
src/components/dashboard/*                 (filter)
src/components/EmrProcessingQueue.tsx      (filter)
src/components/dashboard/RecaptureDashboard.tsx (filter)
src/utils/exportAppointmentsToExcel.ts     (filter)
src/pages/ProjectPortal.tsx                (route + filter)
src/App.tsx                                (route)
mem://features/admin-review-queue          (new memory)
```

## Open follow-ups (will confirm during build)

- Reason taxonomy for Decline (duplicate / spam / wrong project / test / other) — using free-text first, will add presets if you want them.
- Auto-approve allow-list for trusted projects, if any should bypass review.
