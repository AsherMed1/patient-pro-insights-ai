# Split the Review Queue into New and Pending Review

Add a third bucket to the Review Queue so unworked appointments are clearly separated from ones a reviewer has already touched and is still investigating.

## Buckets

```text
[ New (n) ]  [ Pending Review (n) ]  [ Declined (n) ]
```

- **New** — every newly submitted appointment lands here automatically. Default bucket, sorted newest first.
- **Pending Review** — appointments a reviewer explicitly moved here because they need more info, investigation, or follow-up.
- **Declined** — unchanged.

## Behavior

- Rows in **New** get a "Move to Pending Review" action alongside Approve / OON / Decline. Bulk-select supports moving several at once.
- Rows in **Pending Review** get a "Move back to New" action so a mistaken move can be undone.
- Approving, marking OON, declining, or dismissing works identically in both buckets and removes the row from the queue.
- The bucket is stored on the appointment record, so it persists across users, shifts, and refreshes.
- Each bucket button shows a live count; counts refresh on the existing 30-second timer.
- Search, project filter, Short-notice-only, Invalid DOB badge, duplicate detection, inline name/DOB edit, sorting, and row expansion all stay available in both New and Pending Review.
- Every move writes an activity entry ("Moved to Pending Review by {name}") so shift handoffs are auditable.

## Technical notes

- New column on `all_appointments`: `review_stage text not null default 'new'` with a check constraint of `('new','pending_review')`. It is a **sub-state of `review_status = 'pending'`** — `review_status` itself is untouched, so client-portal visibility, the QA Operations `review_queue` case trigger, `ghl-webhook-handler`, and the approved-tag retry sweep all keep working exactly as today.
- Backfill: existing `review_status = 'pending'` rows are set to `review_stage = 'new'` so nothing disappears from view. Index on `(review_status, review_stage)`.
- `ReviewQueue.tsx`: widen `QueueView` to `'new' | 'pending' | 'declined'`, default to `'new'`; the fetch adds `.eq('review_stage', ...)` when the view is New or Pending Review, and `fetchCounts` runs the two pending sub-counts plus declined.
- Bucket move is a plain update of `review_stage` (plus an `appointment_notes` attribution row), followed by a refetch of rows and counts.
