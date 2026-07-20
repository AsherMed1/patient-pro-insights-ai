# QA Operations Queue – Error Sheet Integration + Queue Routing Update

Two coordinated changes: (1) bring the QA error spreadsheet fields into `qa_cases`, and (2) change what enters the daily queue.

## 1. New audit fields on `qa_cases`

Modeled directly on the QA error sheet columns (DATE, QA Name, Patient Name, CLINIC NAME, Self-booked, Patient's Link, ERROR, ERROR SOURCE, CAUGHT BEFORE CLINIC, RESOLUTION TYPE, DATE RESOLVED, TICKET CREATED?, TICKET LINK, STATUS).

Add columns to `qa_cases`:
- `qa_name text` — auto-filled from `assigned_qs_user_id`'s profile, editable
- `self_booked boolean` — reflects appointment origin, editable
- `patient_link text` — deep link to portal patient record (auto-generated from `appointment_id`)
- `error_category text` — enum-like: Missing Insurance, Notes Added to Portal, Duplicate Appointment, Booking Rule Violation, Uploaded Insurance Card, Name Correction, Double Booked, Incorrect Patient Info, Other
- `error_source text` — free text (setter/agent name)
- `caught_before_clinic boolean`
- `resolution_type text` — Resolved by QA, Escalated to AM, Other
- `date_resolved timestamptz` — auto-set when `workflow_status = completed`
- `ticket_created boolean` — derived from `controlhub_ticket_id` presence (kept as stored bool for reporting)
- (existing `controlhub_ticket_url` covers TICKET LINK; existing `workflow_status` covers STATUS)

Backfill: existing rows get NULL for the new fields; `ticket_created` set from existing `controlhub_ticket_id`.

## 2. Queue routing changes

Update `qa_ingest_terminal_status` trigger and any related ingestion:
- Stop creating queue cases for `Cancelled` and `No Show` status transitions
- Keep writing lightweight rows into a new `qa_metrics_events` table (or reuse `qa_case_activity`) so cancellation/no-show totals remain reportable
- Add a new trigger `qa_ingest_confirmed_audit` that creates a `confirmed_audit` case whenever `all_appointments.status` transitions to `Confirmed` (dedup key: `appointment_id + 'confirmed_audit'`, only if not already completed within N days)

Extend `alert_type` accepted values to include `confirmed_audit`. Update the `ALERT_LABELS` map and badge color logic in `QAOperationsQueue.tsx`.

Short-notice and OON ingestion paths remain unchanged.

## 3. UI updates (`src/components/admin/QAOperationsQueue.tsx`)

Filters row — add:
- Clinic filter (already present as `projectFilter` — keep)
- Assignment filter: All / Assigned to me / Unassigned / by QA
- Status filter (workflow_status — already surfaced as tabs, add as multi-select for the "All" tab)
- Date range filter (Entered Queue between X and Y)

Table — add columns: Self-booked, Error Category, Error Source, Caught Before Clinic, Resolution Type, Date Resolved. Keep Ticket + Status columns.

Case drawer — add an "Audit Details" section with editable inputs for the new fields:
- QA Name (auto-defaults to current user; editable dropdown of QA specialists)
- Self-booked toggle
- Patient link (read-only, copy button)
- Error Category dropdown (9 options above)
- Error Source text input
- Caught Before Clinic toggle
- Resolution Type dropdown
- Date Resolved (auto, read-only, shown once completed)

Saving edits writes back to `qa_cases`, appends a `qa_case_activity` row for audit trail (preserves notes, timestamps, escalation history — no existing data touched).

## 4. Reporting hook

Add a `qa_metrics_view` SQL view aggregating: confirmed audits handled, cancellations, no-shows, short-notice, OON — grouped by clinic, QA, week. Exposed later in a Reporting tab (out of scope here beyond the view creation so numbers are queryable).

## Technical section

- Migration: `ALTER TABLE public.qa_cases ADD COLUMN ...` for all 8 new fields; add `CHECK` on `error_category` / `resolution_type` allowed values; update `alert_type` check to allow `confirmed_audit`.
- Trigger changes: modify `qa_ingest_terminal_status` to early-return for `Cancelled`/`No Show`, still insert into `qa_metrics_events`. New `qa_ingest_confirmed_audit` AFTER UPDATE trigger on `all_appointments`.
- Grants unchanged (columns inherit table grants).
- No changes to existing notes/activity/escalation tables — preserved as required.
- Files touched: 1 migration, `supabase/functions/create-controlhub-ticket/index.ts` (pass error_category into ticket payload), `src/components/admin/QAOperationsQueue.tsx` (filters, columns, drawer fields).

## Open question worth confirming after plan approval

Should confirmed-audit cases auto-complete after some window if the QA doesn't touch them (e.g., 72h), or stay open until manually closed? Default in plan: stay open until closed.
