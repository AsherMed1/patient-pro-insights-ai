# Make Review Queue's QA Hold read-only

You're right: QA Operations got a new QA Hold bucket, but the original bucket in the Review Queue was left fully interactive, so the same hold can still be resolved in two places.

## What changes

The Review Queue keeps its **QA Hold** bucket so reviewers can see which patients are waiting on insurance verification, but it becomes a view-only list:

- The **Verified in network** and **Confirm OON** buttons in the Potential OON panel are removed there.
- The row action buttons (Log attempt, Approve, OON, Decline) are hidden for this bucket, matching how the Approved / OON / Declined buckets already behave.
- The panel gains a short line: verification is now handled in QA Operations, with a link/hint pointing there.
- Everything else in the bucket stays: the patient list, the matched plan/group/ID reasons, and the record detail expansion.

Resolving a hold happens only in QA Operations, which is where the audit, notes, escalation and ticket all live.

## Technical details

- `src/components/admin/ReviewQueue.tsx`
  - add `queueView === 'qa_hold'` to the `isReadOnlyView` flag so the existing read-only paths hide the action buttons
  - in the Potential OON panel, render the two resolve buttons only when the view is not `qa_hold`; show a "Verify this record in QA Operations" note instead
  - leave `resolvePotentialOon` in place for any non-QA-Hold surface that still uses it
- No database or edge function changes.
