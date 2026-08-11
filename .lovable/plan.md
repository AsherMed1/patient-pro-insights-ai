# Does step 4 actually happen?

Short answer: **partly.** Confirm OON works end to end. "Verified in network" does not make the appointment client-facing on its own, and setter-submitted (QA hold) records currently have no place to resolve the flag.

## What is true today

**Confirm OON — accurate.** Clicking it clears the flag, writes a review note, then runs the full OON path: `review_status='oon'`, `status='OON'`, IPC set, `appointment-status-webhook` fired, `notify-slack-oon` fired, `appointment-oon` tag pushed to GHL, audit log written, QA case ingested. The record stays admin-only.

**Verified in network — overstated.** It only clears the flag (`potential_oon_resolved_at`, resolution, resolved_by) and writes a note. The reviewer still has to click **Approve** for the appointment to become client-facing. The message implies it happens automatically.

**Setter-submitted route — broken loop.** When a flagged setter appointment is pulled back, it is set to `review_status='pending'` with `review_stage='qa_hold'`. The Review Queue only loads stages `new` and `pending_review`, so that row appears in no queue tab. QA Operations shows a "Potential OON" case but has no Verified / Confirm OON buttons. So there is no in-app way to resolve those records.

## Fixes

1. **Close the QA hold loop.** Add a third bucket to the Review Queue — "QA hold" (`review_stage='qa_hold'`), with its own count badge and the same Potential OON banner and resolve buttons. Restrict it to admin/agent, matching who owns QA.
2. **Wire QA Operations to it.** In the QA record, a `potential_oon` alert gets a clear "Resolve in Review Queue → QA hold" affordance so QA staff aren't stuck.
3. **Make "Verified in network" honest.** After clearing the flag, offer to complete the review in one step: for a QA-hold row, clearing it returns the appointment to approved/client-facing (restoring the pre-hold state); for a normal pending row, show a confirm prompt to approve immediately, or leave it pending if the reviewer declines.
4. **Resolve QA case on outcome.** When the flag is resolved either way, close the matching `potential_oon` QA case with the outcome recorded, so the queue doesn't accumulate stale holds.

## Corrected wording for your message

> **4. What happens next**
> - *Verified in network* — the flag clears and the appointment can be approved; approving it makes it client-facing.
> - *Confirm OON* — the appointment is set to OON, Slack and the GHL workflow fire, a note and audit entry are logged, and the record stays admin-only.

## Technical notes

- `src/components/admin/ReviewQueue.tsx`: `fetch`/`fetchCounts` stage filter, `queueView` type, tab UI, `resolvePotentialOon`.
- `src/components/admin/QAOperationsQueue.tsx`: pointer/affordance for `potential_oon` alerts.
- No schema change needed; `review_stage='qa_hold'` and the `potential_oon_*` columns already exist.
