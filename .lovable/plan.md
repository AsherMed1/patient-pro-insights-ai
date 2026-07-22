## Problem

QA Operations Queue shows 11 "Review Queue" alerts but the actual Review Queue only shows 8. Two other gaps: the queue isn't truly realtime, and the "All" tab has no count.

## Root cause (verified)

Confirmed via DB read of the 11 open `qa_cases` with `alert_type='review_queue'`:
- 8 rows: `all_appointments.review_status = 'pending'` — correctly in queue.
- 3 rows are stale and should have transitioned off `review_queue`:
  - Davey Hines (NG Vascular) — `review_status='approved'`
  - Gloria Correa (Ally Vascular) — `review_status='approved'` (2 sibling rows)

The `qa_ingest_review_queue` trigger already flips approved → `confirmed_audit`, OON → `oon`, and declined/dismissed → completed. These 3 rows predate the trigger (or the trigger raised and swallowed the error), so they never transitioned.

Realtime gap: `qa_cases` is NOT in the `supabase_realtime` publication (verified via `pg_publication_tables`), so the frontend's `postgres_changes` subscription never fires. The queue only refreshes when a user reloads.

"All" tab: the `<TabsTrigger value="all">` renders no badge, unlike the four workflow buckets.

## Plan

### 1. One-time reconciliation migration

Backfill every `qa_cases` row where `alert_type='review_queue'` and `workflow_status <> 'completed'` by re-deriving the correct state from the linked `all_appointments.review_status`:
- `approved` → set `alert_type='confirmed_audit'`, stamp `review_resolved_at`.
- `oon` → set `alert_type='oon'`, stamp `review_resolved_at`.
- `declined` / `dismissed` → set `workflow_status='completed'`, stamp `completed_at`, `date_resolved`, `review_resolved_at`, `resolution_type='Declined in Review Queue'`.
- `pending` or NULL → leave as-is.
- Log a `qa_case_activity` row per fix with `activity_type='status_change'`, description "Reconciled from Review Queue backlog".

This fixes the 3 known stale rows and any similar drift that may accrue.

### 2. Enable realtime on `qa_cases`

Same migration:
```sql
ALTER TABLE public.qa_cases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_cases;
```
The existing `supabase.channel('qa-cases-live').on('postgres_changes', ...)` subscription in `QAOperationsQueue.tsx` will then fire whenever the review-queue trigger updates a case, so approvals/declines/OON in the Review Queue reflect in QA in real time.

### 3. Show count on the "All" tab

In `src/components/admin/QAOperationsQueue.tsx`:
- Extend `bucketCounts` with `all: filteredNoStatus.length`.
- Render a `<Badge>` inside `<TabsTrigger value="all">` matching the pattern used for New/In Review/Pending/Completed.

## Technical notes

- The trigger itself is correct — no code change needed there. The reconciliation is a data fix, not a logic fix.
- Realtime publication add is idempotent-safe (guarded with a check in the migration).
- No changes to Review Queue UI, no changes to the ingest logic, no schema changes.
- After migration, QA queue "Review Queue" bucket will exactly mirror `all_appointments` rows with `review_status='pending'` (8), and stay in sync live.

## Files touched

- New Supabase migration (reconciliation + realtime publication).
- `src/components/admin/QAOperationsQueue.tsx` — badge on the All tab.
