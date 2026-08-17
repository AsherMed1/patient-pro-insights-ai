# Approved bucket in the Review Queue

Add a fourth, read-only bucket to the Review Queue so approvals stay visible as an audit trail instead of disappearing from the workflow.

## What the user sees

- A new **Approved** button next to New, Pending Review, and Declined, with a live count badge that refreshes on the same 90-second polling cycle as the other counts.
- Clicking it lists every appointment whose review status is `approved`, newest approval first.
- Each row shows: patient name/contact, **Approved by** (reviewer's name), **approval date/time**, appointment date/time, clinic (project), and service line (calendar name) — the same card layout used today, with the "Declined … by …" line replaced by "Approved … by …".
- Search (name / phone / email) and the project filter work exactly as in the other buckets. Bucket-specific controls that only apply to open work (Short notice only, Needs follow-up, Invalid DOB, bulk Approve/Decline, checkboxes) are hidden here, as they already are in the Declined bucket.
- Rows stay clickable to open the existing Appointment Details drawer, so full patient details and notes remain reachable.
- The bucket is read-only: no approve/decline/restore actions, so a record cannot be accidentally reprocessed from here.

## Data and sync

No schema change is needed. Approval already writes `review_status = 'approved'`, `reviewed_at`, and `reviewed_by` on the appointment row, and the client portal / QA Operations read that same row — so the new bucket reflects the live approval state automatically and stays in sync with any later status change.

## Technical notes

All changes are in `src/components/admin/ReviewQueue.tsx`:

- Extend `QueueView` with `'approved'`; add `approvedCount` state.
- In `fetch()`: when `queueView === 'approved'`, query `review_status = 'approved'`, order by `reviewed_at` desc (nulls last), keep the reserved-block exclusion, the project filter, the search `or(...)`, and the 500-row cap.
- Reuse the reviewer-name lookup (currently gated on the declined view) for the approved view so `reviewed_by` UUIDs resolve to profile names.
- In `fetchCounts()`: add a fourth `base('approved')` count to the existing `Promise.all`.
- Introduce `isApprovedView` and a shared `isReadOnlyView = isDeclinedView || isApprovedView`, then swap the existing `!isDeclinedView` / `isDeclinedView` guards around filters, bulk bar, checkboxes, action buttons, and badges to the read-only flag so the approved bucket renders like the declined one.
- Add the "Approved {date} by {name}" line and update the empty-state message.
