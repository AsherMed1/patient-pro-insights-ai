---
name: QA Escalation Workflow
description: Centralized escalation handling in QA Operations — Escalation Type (renamed from Resolution Type), Escalation Status, auto-assignment, escalation worklist, notifications, and reporting.
type: feature
---

**Escalation Type** = `qa_cases.resolution_type` (label-only rename; values unchanged: Resolved by QA, Escalated to Tech, Escalated to AM, Escalated to Gloria, Other).

**Escalation Status** = `qa_cases.escalation_status` — Awaiting Review, Awaiting Clinic Response, Follow-Up Required, Response Received, Resolved. Kept fully separate from `workflow_status`. Trigger `trg_qa_cases_escalation_status_sync`: workflow `completed` → status `Resolved`; reopen of a completed case → `Follow-Up Required`.

**Auto-assignment:** selecting an "Escalated to …" type on save sets `escalated_at`, `escalated_by_user_id`, workflow `pending_escalated`, escalation status `Awaiting Review`, and for "Escalated to Gloria" resolves `escalation_owner_user_id` from the fixed owner email map in `src/lib/qaEscalation.ts` (gloria.g@patientpromarketing.com). Extend that map for future fixed owners.

**Escalation worklist:** `src/components/admin/QAEscalationWorklist.tsx`, reachable from the "Escalations" toggle in the QA Operations header (visible to every QA user, not just admins). Columns: patient/clinic, alert, escalation type, workflow, escalation status, owner, escalated by, date escalated, latest note, linked Control Hub ticket + status, days outstanding (amber ≥3d, rose ≥7d). CSV export.

**Notifications:** `qa_note_mentions` doubles as the notification feed — `kind` ∈ mention | assignment | escalation_status | ticket_update | case_status, with `title`/`body` and nullable `note_id`. Fan out via `notifyQAUsers()` in `src/lib/qaEscalation.ts` (drops self-notifications). `controlhub-ticket-webhook` notifies owner + escalator on every ticket event. Bell (`MentionsBell.tsx`) renders all kinds and deep-links to `/?tab=qa-queue&qaCase=<id>[&note=<id>]`.

**Reporting:** `QAReports.tsx` has an Escalations card — escalated count, still open, avg resolution time (escalated_at → resolved), avg outstanding age, breakdowns by escalation status and assigned owner. Raw export includes Escalation Type / Status / Escalated At.
