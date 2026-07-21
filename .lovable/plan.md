# Review Queue as a QA Alert Type

Track Review Queue appointments in the QA Operations Queue as a first-class alert type alongside Confirmed Audit and OON, with full lifecycle history (entered → approved/declined/OON) so Quality Specialists can see how long each appointment sat awaiting review and who resolved it.

## Behavior

**New alert type:** `review_queue`

**Ingestion (triggered on `all_appointments`):**
- When a row is inserted with `review_status = 'pending'`, or when `review_status` transitions to `pending`, open a QA case with `alert_type = 'review_queue'`.
- Case status starts as `new`; activity log records "Entered Review Queue" with timestamp.

**Lifecycle transitions on the same QA case (no new case created):**
- `review_status` → `approved` and `status` = Confirmed / Showed / Won → flip `alert_type` from `review_queue` to `confirmed_audit`. Log "Approved by {name}" with timestamp; keep the case in the queue for confirmed auditing.
- `review_status` → `oon` (or `status` → OON) → flip `alert_type` to `oon`. Log "Marked OON by {name}".
- `review_status` → `declined` or `dismissed` → close the QA case (`status = completed`, resolution auto-set to "Declined in Review Queue"). Log actor + timestamp.

**Timing metrics stored on `qa_cases`:**
- `review_entered_at` (when it first hit the Review Queue)
- `review_resolved_at` (when it left the Review Queue via approve/decline/OON)
- Derived "time in Review Queue" shown in the case detail drawer.

**Activity log entries** (existing `qa_case_activity` table) record each transition with actor (from `reviewed_by` → `profiles.full_name`) so the case history reads:
1. Entered Review Queue — {timestamp}
2. Approved / Declined / Marked OON by {name} — {timestamp}
3. (If approved) Alert switched from Review Queue → Confirmed Audit

## UI (`QAOperationsQueue.tsx`)

- Add `review_queue` to `AlertType`, `ACTIVE_ALERT_TYPES`, `ALERT_LABELS` ("Review Queue"), and `alertVariant` (distinct color, e.g. amber).
- Add "Review Queue" option to the Alert Type filter dropdown.
- Case detail drawer: new "Review Queue Timeline" block showing entered_at, resolved_at, duration, and actor when applicable.
- Table Alert column shows the current alert badge; when it flips (e.g., Review Queue → Confirmed Audit) the badge updates and the timeline preserves the history.

## Technical Details

**Migration:**
1. Extend `qa_cases_alert_type_check` constraint to include `'review_queue'`.
2. Add columns `qa_cases.review_entered_at timestamptz`, `qa_cases.review_resolved_at timestamptz`.
3. New trigger function `qa_ingest_review_queue()` on `all_appointments` AFTER INSERT/UPDATE OF `review_status`:
   - On pending (insert or transition into pending): call `qa_upsert_case(..., 'review_queue', ...)` and stamp `review_entered_at = now()`.
   - On approved: `UPDATE qa_cases SET alert_type='confirmed_audit', review_resolved_at=now()` for the matching appointment_id + alert_type='review_queue'; insert activity row "Approved by {name}".
   - On oon: same pattern, flip to `alert_type='oon'`, stamp resolved_at.
   - On declined/dismissed: mark QA case completed with resolution "Declined in Review Queue", stamp resolved_at.
4. Update `qa_upsert_case` to accept `review_queue` (no logic change beyond the constraint).
5. Backfill: for every current `all_appointments` row where `review_status = 'pending'` and no existing QA case, insert a `review_queue` case with `review_entered_at = created_at`. For historical approved/declined rows we do not backfill (no reliable entered timestamp).

**Frontend edits:** `src/components/admin/QAOperationsQueue.tsx` only — types, labels, filter option, badge variant, timeline block in the detail drawer.

**Memory update:** append Review Queue as an alert type to `mem://features/qa-operations-queue`.

## Out of Scope

- No changes to Review Queue UI itself (`ReviewQueue.tsx`) — actors/timestamps already captured in `reviewed_by` / `reviewed_at`; the QA triggers read those.
- No new ControlHub ticket behavior.
