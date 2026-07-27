## Goal
The QA Operations activity timeline shows "Status changed to in review". The bucket is already labeled "Opened" everywhere else, so the activity text should match.

## Changes (all in `src/components/admin/QAOperationsQueue.tsx`)

1. **New activity entries** — in `updateStatus`, replace the raw `next.replace('_', ' ')` with a lookup against the existing status-label list, so the inserted description reads "Status changed to Opened" (and uses the friendly label for the other statuses: New, Pending/Escalated, Completed, Reopened).

2. **Existing history rows** — old rows already stored "in review" text in the database. At render time in the activity list, map any stored description containing "in review" to "Opened" so historical entries display consistently. No data migration needed.

## Notes
Display-only change; workflow status values in the database stay `in_review`.
