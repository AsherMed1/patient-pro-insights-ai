# Recapture Worklist

A new Portal section, **Recapture**, that automatically receives cancelled and no-show appointments as workable records for the Setter team, tracks every outreach attempt, links successful rebookings to the real new appointment, and reports on recovery performance. Cancelled and no-show stay distinct states end to end. The no-show / cancellation alerts currently shown in QA Operations move here and are removed from the QA view.

## What exists today (verified)

- `qa_ingest_terminal_status_trg` on `all_appointments` already fires on every status change and creates QA cases with `alert_type = 'no_show'` or `'cancelled'`, plus rows in `qa_metrics_events` for aggregate trending.
- QA Operations Queue renders those two alert types behind an admin-only "show terminal alerts" toggle (`TERMINAL_ALERT_TYPES` in `QAOperationsQueue.tsx`).
- A `recapture_events` view and the `link_recapture_on_active` trigger already detect when a lost patient rebooks within 90 days and stamp `recaptured_from_appointment_id` on the new appointment. `RecaptureDashboard.tsx` reads that view read-only.
- Roles: `admin`, `agent`, `project_user`, `va`, `review_only`, `qa_specialist`. `review_only` is the pilot setter role with Review Queue access.

The gap is the worklist layer: no assignment, no attempt log, no work status, no outcome, no completion timestamps.

## Build

### 1. Data model (new tables)

`recapture_cases` — one workable record per lost appointment:
- link to appointment, ghl contact id, project, patient name, service line
- `lost_type` (`cancelled` | `no_show`) kept separate, never merged
- `lost_status_at_entry`, appointment date, entered-worklist timestamp
- `assigned_user_id`, `work_started_at`, `work_status` (pending / engaging / follow_up_required / completed)
- `outcome` (the 9 completion outcomes), `outcome_notes`, `completed_at`, `completed_by`
- `rebooked_appointment_id` (FK to `all_appointments`), `recovered` boolean
- `attempt_count`, `first_attempt_at`, `last_attempt_at` (maintained by trigger)
- `stale` flag when the source appointment leaves the cancelled/no-show state (prevents double-touching a record that already moved on)

`recapture_attempts` — one row per outreach attempt: case id, channel (call / text / email / voicemail), attempted_at, result, note, user.

Both get GRANTs, RLS (admin/agent/va full; setter role scoped like the Review Queue), and `updated_at` triggers.

### 2. Auto-intake

Extend the existing terminal-status trigger so the same status change that creates the QA case also upserts a `recapture_case`, carrying `lost_type` from the status. Reschedule-blocked patients (`is_reschedule_blocked`) are skipped, matching current recapture linking. A backfill seeds cases from existing cancelled / no-show appointments in a chosen lookback window.

A second trigger closes the loop: when `link_recapture_on_active` stamps `recaptured_from_appointment_id` on a new appointment, the matching open case is auto-marked recovered with `rebooked_appointment_id` set — so a rebooking recorded in GHL and synced to the Portal cannot diverge from what the worklist claims.

### 3. Worklist UI — `src/components/recapture/RecaptureQueue.tsx`

Table with buckets by work status (Pending / Engaging / Follow-Up Required / Completed) and counts per bucket. Filters: clinic, lost type (Cancelled vs No-Show, separate), date range, service, assigned user, work status. Search by name / phone / email.

Per row: patient name + phone, clinic, lost type badge, lost date, days since lost, attempts, assignee, work status, last activity. Actions: Claim / Assign, Open Portal record, Open GHL record (direct link, same resolver as elsewhere), Log Attempt, Add Note, Set Work Status, Complete.

Detail drawer: appointment history and communication history for the patient, the attempt log, internal notes, and the completion form. Choosing "Patient successfully rebooked" requires either picking the newly created appointment (searched from `all_appointments` for that patient) or entering the new appointment details, which then link the record.

### 4. Placement and access

- New top-level **Recapture** tab in the Portal, shown to admin, agent, va, and the setter role, sitting next to Review Queue so setters reach it in the same workflow. Review Queue gets a link across to Recapture.
- QA Operations: remove `no_show` and `cancelled` from `TERMINAL_ALERT_TYPES` and drop the terminal-alert toggle, so QAs no longer see those alerts. Existing terminal QA cases are left in place historically but filtered out of the QA view.

### 5. Reporting — Recapture Reports sub-tab

Aggregates over cases and attempts, with clinic and date filters plus CSV/Excel export:
- total cancelled and total no-show (reported separately and combined)
- records worked, total contact attempts, contact rate
- successful rebooking rate (split by lost type)
- recovered by clinic, recovered by setter
- average time to first attempt, average time to completion
- breakdown of non-recovery outcomes
- weekly cancellation and no-show trend by clinic (from `qa_metrics_events` plus case data), so leadership sees aggregate movement without anyone working every record

## Sequencing

1. Migration: tables, RLS, grants, triggers, backfill.
2. Worklist UI + tab wiring + role gating.
3. Detail drawer: attempts, notes, outcome with rebooking link.
4. QA Operations terminal-alert removal.
5. Reports sub-tab and export.

## Assumptions worth confirming

- "Setter team" maps to the existing `review_only` role (plus admin/agent/va). If setters should be a new role, say so and it becomes a separate role in the same migration.
- Backfill window for seeding existing cancelled / no-show records: last 90 days unless you want more.
