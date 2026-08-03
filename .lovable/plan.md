# Prevent duplicate Review Queue rows after a GHL reschedule

## What happened with Joe Hernandez

GHL reschedules create a brand-new appointment event ID, so the portal writes a new row. There is already de-duplication that retires the contact's older rows — but it explicitly skips any row still waiting on a Review Queue decision (`review_status = 'pending'`). Joe's Aug 4 row was still pending, so it stayed visible alongside the new Aug 11 row and the clinic saw the patient twice.

## Fix

1. **Retire pending rows that a newer booking clearly replaces.** In the de-duplication step of the GHL webhook handler, stop blanket-skipping pending rows. Retire an older pending row when it belongs to the same contact + project and either has no date or is dated before the new booking. Keep skipping reserved blocks, declined/dismissed snapshots, and rows dated after the new booking.

2. **Carry the queue state forward instead of losing it.** When the retired row was pending, copy its review stage/claim info onto the new row so the appointment stays in the same Review Queue bucket and doesn't jump back to the top as an unrelated "New" item.

3. **Leave a clear trail.** Write an audit note on both rows: the retired one says it was replaced by the newer booking (with date + event ID), the new one says it replaces the earlier date. This is what was missing when the clinic had to ask us to remove the Aug 4 entry.

4. **Backfill existing duplicates.** One-time sweep over active rows grouped by contact + project: where a contact has more than one active row and one is an earlier-dated pending/open booking, retire the older one with the same audit note. Report the count before applying.

5. **Ongoing safety net.** Extend the existing scheduled sweep so any contact that ends up with more than one active row per project is logged, so we catch new patterns without waiting for a clinic report.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts` → `supersedeOlderContactRows()`: replace the `review_status === 'pending'` early-return with the date-aware rule; add review-stage carry-forward and the note on the surviving row.
- De-dup currently only runs on newly created rows (`!isUpdate`), which is the right trigger for reschedules — no change needed there.
- Backfill runs as a migration/one-off query against `all_appointments` using `ghl_id + project_name`, touching only `is_superseded` and inserting `appointment_notes`; no deletions.
