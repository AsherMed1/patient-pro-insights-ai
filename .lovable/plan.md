## Problem

QA Operations Queue shows 15 open `review_queue` alerts, but only 8 appointments actually have `review_status='pending'` (matches the Review Queue module, which is project‑scoped for the user's view of "7"). 7 QA cases are stale — the linked appointment is already `approved` or `oon`, but the QA case is still tagged `review_queue`.

## Root cause (verified)

`qa_ingest_review_queue` transitions the case's `alert_type` from `review_queue` → `confirmed_audit` (on approve) or → `oon` (on OON) via `UPDATE qa_cases SET alert_type = ...`.

The unique index `qa_cases_dedup_active` on `(appointment_id, alert_type) WHERE workflow_status <> 'completed'` blocks that UPDATE whenever a sibling active `confirmed_audit` or `oon` case already exists for the same appointment (very common — every approved appointment also gets a `confirmed_audit` case from `qa_ingest_confirmed_audit`). The trigger's outer `EXCEPTION WHEN OTHERS` swallows the unique‑violation silently, so the `review_queue` case is never resolved.

Same pattern as the prior 3‑row drift; every future approval where a `confirmed_audit` case pre-exists will leak another stale row.

## Plan

Only touches QA Operations. Review Queue module is untouched.

### 1. Fix the trigger so it stops producing drift

Update `qa_ingest_review_queue` so that when transitioning out of `pending`:
- Attempt the `alert_type` switch as today.
- If a sibling active case of the target `alert_type` already exists (unique‑violation `23505` on `qa_cases_dedup_active`), instead **complete the review_queue case as a duplicate**: set `workflow_status='completed'`, stamp `completed_at`, `date_resolved`, `review_resolved_at`, `resolution_type='Resolved by QA'`, and log a `qa_case_activity` row noting it was closed because a `confirmed_audit`/`oon` sibling already covers the appointment.
- Apply the same fallback for the `oon` branch.
- Keep the outer catch‑all so unrelated errors still don't block user updates, but handle the unique‑violation explicitly first.

### 2. One-time reconciliation

For each open `review_queue` case where the linked `all_appointments.review_status` is no longer `pending`, re-derive state:
- `approved` → if no active sibling `confirmed_audit` case, flip this case to `confirmed_audit` and stamp `review_resolved_at`. If a sibling exists, complete this case as duplicate (`Resolved by QA`, note "Reconciled — Confirmed Audit sibling already exists").
- `oon` → same pattern against sibling `oon` case.
- `declined` / `dismissed` → complete with `Resolved by QA` + note "Declined in Review Queue".
- Log a `qa_case_activity` row per fix ("Reconciled from Review Queue backlog").

Uses only allowed `resolution_type` values from `qa_cases_resolution_type_check`.

### 3. No UI changes

`QAOperationsQueue.tsx` already renders correct counts once the underlying rows are right, and realtime is already enabled from the last fix. No frontend edit needed.

## Files touched

- New Supabase migration:
  - Replace `qa_ingest_review_queue` function body (collision‑safe).
  - Data reconciliation for the 7 currently stale rows.

## Technical notes

- `Review Queue` module (`ReviewQueue.tsx`) is not modified — no code, no queries.
- After migration: QA `review_queue` bucket will equal `all_appointments.review_status='pending'` count (currently 8 globally; the user sees 7 in their scoped Review Queue view because Review Queue applies project filters).
- Reconciliation is idempotent and guarded against unique‑index collisions the same way the new trigger is.
