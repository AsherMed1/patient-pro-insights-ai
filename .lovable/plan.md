# Add an OON bucket to the Review Queue

Records marked OON from the Review Queue are stored with `review_status = 'oon'` (521 rows today) and no bucket renders them, so once a reviewer marks a patient OON the record disappears from the queue entirely. This adds a visible, read-only OON bucket.

## What gets added

- A new **OON** bucket button next to Declined / Approved, with a live count badge that respects the same project filter and search box as the other buckets.
- Selecting it lists appointments with `review_status = 'oon'`, newest reviewed first, showing patient, clinic, appointment date, who marked it OON and when, plus the reason/notes recorded at the time.
- Potential-OON match details (which insurance rule fired) stay visible on the row where present, so it's clear why the record was flagged.
- The bucket behaves like Declined/Approved: read-only history, no Approve / OON / Log-attempt actions and no bulk selection. Opening the record's detail view still works.

Reserved time blocks and retired (superseded) rows are excluded, matching every other bucket.

## Technical notes

`src/components/admin/ReviewQueue.tsx` only:

- Widen `QueueView` with `'oon'`; add `oonCount` state.
- `fetch`: `review_status` selector gains the `'oon'` case; treat `'oon'` alongside `'declined' | 'approved'` for ordering by `reviewed_at`, reviewer-name lookup, and skipping the `review_stage` filter.
- `fetchCounts`: add `base('oon')` to the parallel batch and set `oonCount`.
- Add the bucket button; include `'oon'` in the read-only guards (`isDeclinedView`-style checks) so action buttons and checkboxes stay hidden, and add an empty-state string.
- No database, RLS, or edge-function change — the rows already exist and are readable.

The red Review Queue tab badge keeps counting only actionable buckets (New + Pending Review + QA Hold); OON is history, not a to-do.
