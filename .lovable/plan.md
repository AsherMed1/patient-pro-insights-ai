
## Goal

Make the QA case drawer's **Activity** section a complete audit trail of the Review Queue lifecycle. Every case that came from the Review Queue should show, in order:

1. When the appointment entered the Review Queue
2. How long it sat there (duration until resolution)
3. When it was approved / declined / marked OON
4. Who performed the action
5. When the alert switched from Review Queue → Confirmed Audit or → OON

## Current state (verified)

- Trigger `qa_ingest_review_queue` (migration `20260722132346`) already writes `qa_case_activity` rows for:
  - Case creation with description `'Entered Review Queue'` (via `qa_upsert_case`)
  - Approve → switch to `confirmed_audit` (with reviewer name)
  - OON → switch to `oon` (with reviewer name)
  - Declined / dismissed → completion (with reviewer name)
- `review_entered_at` and `review_resolved_at` columns exist on `qa_cases` and are stamped by the trigger.
- The drawer renders the raw activity list at `QAOperationsQueue.tsx` lines ~973–984, one line per row, description + timestamp.
- Duration in queue is **not** written anywhere in activity; reviewer identity is embedded in the description string but not separated; the "entered queue" event only exists when the case was first opened as a `review_queue` alert (fine).

## Changes

### 1. Trigger updates (migration)

Update `public.qa_ingest_review_queue` so that on each terminal transition (approved / oon / declined / dismissed / duplicate-closed) it:

- Computes `duration_minutes = EXTRACT(EPOCH FROM (now() - review_entered_at)) / 60` when `review_entered_at` is set.
- Writes an extra `qa_case_activity` row with `activity_type = 'review_queue_duration'` and description like `Spent 2h 14m in Review Queue`, plus `metadata.duration_minutes`, `metadata.review_entered_at`, `metadata.review_resolved_at`.
- Keeps the existing status_change row but also stores structured `metadata`:
  - `actor_user_id` (already set as column)
  - `actor_name`
  - `from_alert`, `to_alert` (or `resolution` for declined/dismissed)
  - `review_status`

No schema change needed — `qa_case_activity` already has `metadata jsonb` and `actor_user_id`.

Also backfill: for any completed `review_queue`-origin case that has `review_entered_at` and `review_resolved_at` but no `review_queue_duration` activity row, insert one.

### 2. Frontend rendering (`src/components/admin/QAOperationsQueue.tsx`)

- Extend `ACTIVITY_LABELS` with `review_queue_duration: 'Time in Review Queue'`.
- In the Activity list (lines ~973–984), for each row:
  - Render the description as today.
  - When `activity_type = 'status_change'` and `metadata.from_alert = 'review_queue'`, add a small secondary line showing "by {actor_name}" and the target alert badge.
  - When `activity_type = 'review_queue_duration'`, render with a `Clock` icon and the humanized duration from `metadata.duration_minutes` (e.g. `2h 14m`, `3d 5h`).
- Sort activity ascending (oldest → newest) inside the Review Queue lifecycle block so the story reads top-down: Entered → Duration → Resolved / Alert switched. Keep the existing overall list order for non-lifecycle rows.
- No changes to the separate "Review Queue Timeline" section that already exists in the drawer.

### 3. Scope guardrails

- Only `qa_ingest_review_queue` is touched. `qa_ingest_confirmed_audit`, `qa_ingest_terminal_status`, and the Review Queue module itself are untouched.
- No changes to `qa_cases` columns, RLS, grants, or realtime publication.
- No behavior change for cases that never entered the Review Queue.

## Technical notes

- Duration formatting helper (frontend) reused: `< 60` → `Nm`, `< 1440` → `Xh Ym`, else `Xd Yh`.
- Trigger writes to `qa_case_activity` inside the existing `BEGIN … EXCEPTION WHEN OTHERS` block so any failure is swallowed and never blocks the review action.
- Backfill DO-block guarded with `WHERE NOT EXISTS (… activity_type = 'review_queue_duration' …)` to be idempotent.
