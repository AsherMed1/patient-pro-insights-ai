## Problem

The QA Operations Queue shows OON (66) cases but zero **Confirmed Audit** cases, even though 1,292 confirmed appointments exist.

**Root cause:** `trg_qa_ingest_confirmed_audit` only fires on `AFTER UPDATE OF status` where the *previous* status was different from `'confirmed'`. In practice:

- New appointments are inserted directly with `status='Confirmed'` (default from GHL sync / Review Queue approval) → no UPDATE fires, so no case is created.
- Appointments that were already Confirmed before the trigger was deployed were never enqueued.

That's why the queue is empty of confirmed audits.

## Fix

1. **Add an INSERT-side trigger** on `all_appointments` that calls the existing `qa_ingest_confirmed_audit` logic when a row is inserted with `status='Confirmed'` (and not a reserved block / superseded). Reuse `qa_upsert_case` so dedup by `(appointment_id, alert_type)` still holds.
2. **Also enqueue on Review Queue approval.** When admin approval flips `review_status` to `approved` on an already-Confirmed row, ensure a `confirmed_audit` case is created (approval is the moment the appointment becomes clinic-visible, so that's the right audit trigger).
3. **Backfill** existing confirmed, non-superseded, non-reserved, review-approved (or legacy pre-review-queue) appointments into `qa_cases` as `confirmed_audit / new`, respecting the existing dedup key so no duplicates are created for rows that already have an OON or short-notice case.

No UI changes — the queue already filters to `short_notice | oon | confirmed_audit` and renders the "Confirmed Audit" badge.

## Technical details

- New trigger: `AFTER INSERT ON public.all_appointments FOR EACH ROW WHEN (LOWER(TRIM(NEW.status)) = 'confirmed')` → reuse `qa_ingest_confirmed_audit` (or split into a shared helper called from both INSERT and UPDATE paths).
- Extend/replace `qa_ingest_confirmed_audit` to accept both TG_OP='INSERT' and 'UPDATE'; skip the `old <> new` guard on INSERT.
- Optional: `AFTER UPDATE OF review_status` trigger firing when `review_status` transitions to `approved` and status is `Confirmed`, so pending-review confirmations enter the queue at approval time rather than webhook time.
- Backfill SQL: `INSERT INTO qa_cases (...) SELECT ... FROM all_appointments WHERE status ILIKE 'confirmed' AND NOT is_reserved_block AND NOT is_superseded AND COALESCE(review_status,'approved') IN ('approved') AND NOT EXISTS (SELECT 1 FROM qa_cases q WHERE q.appointment_id = all_appointments.id AND q.alert_type = 'confirmed_audit')`.
- Wrap trigger body in the same EXCEPTION block already used, so a QA ingestion error can never block a clinical INSERT/UPDATE.

## Open question

Do you want the backfill to enqueue **all 1,292 existing confirmed appointments** at once (large one-time queue for QA), or only ones confirmed in the **last N days** (e.g., 14 or 30)?
