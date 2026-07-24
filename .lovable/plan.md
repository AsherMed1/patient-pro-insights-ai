## Issue 1 — Alert Type filter evaluates every historical row

**Current behavior (verified in `QAOperationsQueue.tsx` lines 358–402):** `filteredNoStatus` filters raw `qa_cases` rows by `c.alert_type === alertFilter`, then `groupCases` picks the group's primary from whichever rows survived. So for James Finley the historical `review_queue` row is the only survivor when Alert = Review Queue, and it becomes the "primary" — showing him under **New** even though his actual latest alert is the Pending/Escalated `confirmed_audit`/`short_notice`.

**Fix:** Group first, filter second (on the group's *latest* alert), so Alert Type filter reflects each patient's current alert only.

- Compute groups from the unfiltered case set (minus non-alert-type filters like project/assignment/date/search).
- After grouping, drop groups whose `primary.alert_type` (i.e., latest alert for that patient) doesn't match the selected Alert Type. If Review Queue is picked and it's not the latest, that patient returns zero results.
- Bucket counts and the visible table both derive from this post-group filter, so counts stay consistent.

## Issue 2 — 69 stale Review Queue alerts under New

**Current behavior:** `qa_ingest_review_queue` opens a `qa_cases` row for every appointment that enters `review_status='pending'`, regardless of whether it's a short-notice case. Declined/dismissed appointments transition out of `pending` but the QA case is only closed by the reconcile step for terminal statuses that the trigger recognizes — the rest linger as open `new` cases (the 69 stragglers).

**New rule per request:** A Review Queue alert should exist in QA Operations **only when the same appointment also has a Short Notice alert**. All other Review Queue cases should not appear.

Plan:

1. **Migration — stop ingesting standalone Review Queue cases.**
   Replace `qa_ingest_review_queue()` so that when `review_status` becomes `pending`, it opens (or refreshes) a `review_queue` case only if there's a non-completed `short_notice` case for the same `appointment_id`. Otherwise, no-op.

2. **Migration — link Review Queue to Short Notice from the other direction.**
   Update `qa_ingest_short_notice` (or add a small trigger on `short_notice_alerts` INSERT) so that when a Short Notice case is opened and the appointment is currently in `review_status='pending'`, it also opens a paired `review_queue` case. This covers the ordering where Short Notice arrives after the pending flag.

3. **Migration — resolution paths unchanged.**
   Keep the existing transition logic (Approve → flip to `confirmed_audit`; OON → flip to `oon`; Declined/Dismissed → mark case completed with resolution "Declined in Review Queue"). It already handles pairs correctly.

4. **Migration — one-time cleanup of the 69 stragglers.**
   Mark all currently open `review_queue` QA cases as `completed` with resolution `Declined in Review Queue` (and `completed_at = now()`) when either:
   - the appointment is no longer `review_status='pending'` (declined/dismissed/approved/OON already happened), OR
   - there is no open Short Notice case for that appointment.
   Log activity rows for the audit trail.

5. **UI — no changes required beyond Issue 1.**
   The Alert Type dropdown keeps `Review Queue` as an option; after the ingest change and cleanup, that filter will surface only Review-Queue-with-Short-Notice pairs.

## Files touched

- `src/components/admin/QAOperationsQueue.tsx` — reorder filter/group so Alert Type filters on `group.primary.alert_type`.
- New migration:
  - Rewrite `qa_ingest_review_queue()` with the Short Notice gate.
  - Add/adjust Short Notice ingest to open the paired Review Queue case when appropriate.
  - Backfill: complete stale open `review_queue` cases.

## Validation

- Search "James Finley", pick Alert Type = Review Queue → 0 results; leaving Alert Type = All keeps him under Pending/Escalated.
- New bucket's Review Queue count drops to only appointments that also have an active Short Notice.
- New Short Notice on a pending-review appointment produces a linked Review Queue row so QA can coordinate with Setters.
- Approving a paired Review Queue case still flips it to `confirmed_audit` (routine audit) as today.