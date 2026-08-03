# Merge duplicate bookings at approval time (Joe Hernandez case)

## Intended behavior

While both rows are still pending in the Review Queue, keeping both is correct — the setter needs to see the original and the rescheduled booking. The merge should happen at the moment the newer booking is **approved**: approving it retires the older active row for the same patient so the clinic only ever sees one active appointment.

## Where the current logic falls short

There is already a database trigger that supersedes older active rows when an appointment moves from pending to approved. It only runs on an **update** of `review_status`, so it never fires for rows that are created already approved — which is what happens when GHL marks the booking as setter-submitted (auto-approved on insert, no pending step). Joe's Aug 11 row came in already approved, so nothing retired the Aug 4 row and both stayed visible.

## Fix

1. **Also merge when a row is created already approved.** Extend the supersede logic to fire on insert of an approved, non-reserved row, using the same sibling rules as the existing approval path (same contact + project, older, non-terminal, not superseded). This closes the auto-approve gap that produced the Joe Hernandez duplicate.

2. **Include older pending rows in what gets retired at approval.** Today the approval merge only touches siblings that are approved or unreviewed; an older row still sitting in the Review Queue survives. When a newer booking for the same contact is approved, the older pending row should be retired too (unless it is dated *after* the approved booking), so it disappears from the queue instead of lingering as a second entry.

3. **Keep the pending-stage behavior unchanged.** No change to the webhook's create-time de-duplication: two pending rows may coexist in the Review Queue by design. The merge is approval-driven only.

4. **Audit trail on every merge.** The retired row gets a note naming the approved booking that replaced it (date + portal ID), and the surviving row gets a note that it replaced an earlier booking, so clinics and QA can see why an appointment vanished from the queue.

5. **One-time cleanup.** Sweep existing contacts that have more than one active row per project where one is approved and newer: retire the older one with the same note. Report the count first, apply after review.

## Technical notes

- `public.supersede_on_review_approval()` (migration `20260730195629_…`): add an INSERT path (or a companion `AFTER INSERT` trigger) for rows arriving with `review_status = 'approved'`; relax the sibling filter so `review_status = 'pending'` rows older than the approved booking are also superseded, while still excluding reserved blocks, terminal rows, declined/dismissed snapshots, and rows dated after the approved one.
- No change needed in `ghl-webhook-handler`'s `supersedeOlderContactRows()` — it already skips pending rows, which matches the desired pending-stage behavior.
- Cleanup runs against `all_appointments` keyed on `ghl_id + project_name`, touching only `is_superseded` plus `appointment_notes` inserts; no deletions.
