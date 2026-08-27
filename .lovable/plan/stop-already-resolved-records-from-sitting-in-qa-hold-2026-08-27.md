# Stop already-resolved records from sitting in QA Hold

## What the data shows

Both records in the QA Hold bucket are already finished — they only appear because their
Potential OON flag was never cleared:

```text
Liberty TEST DO NOT TOUCH   Liberty Medical             status OON        review_status oon
Carmen Maounis              Joint & Vascular Institute  status Cancelled  review_status declined
```

Both still carry `potential_oon = true` with `potential_oon_resolved_at = null`.

The QA Hold bucket is defined purely as "flag set and not resolved" (`isQaHold` in
`QAOperationsQueue.tsx`), with no check on the appointment's status. When a record is
resolved elsewhere — marked OON, cancelled, or declined in the Review Queue — nothing
stamps the flag, so it keeps showing up as work waiting on insurance verification.

The earlier guard added to `evaluate-potential-oon` only stops *new* flags on terminal or
past appointments; it does not clear flags already on the row.

## The fix

1. **QA Hold only lists actionable records.** A record drops out of the bucket when the
   appointment is no longer workable: terminal status (Cancelled, No Show, Showed, Won,
   OON, Do Not Call, Rescheduled), `review_status` of oon / declined / dismissed, the row
   is superseded, or the appointment date has passed. Same rule the OON evaluator already
   uses, applied at display time so nothing can leak in again.

2. **Auto-stamp the flag when a record reaches a terminal state.** Whenever the
   appointment goes terminal or is declined/OON'd, `potential_oon_resolved_at` gets
   stamped with a resolution reflecting how it ended, so the flag stops being a dangling
   open item. Logged as a `potential_oon_resolved` activity row on the case, as today.

3. **Clean up the two current rows** (and any other already-terminal held rows) by
   stamping their resolution timestamp. No status, note, or GHL change — the records
   simply stop appearing as pending QA Hold work.

Records genuinely awaiting verification are unaffected: live, non-terminal, future-dated
holds keep their Verified-in-network / Confirm OON actions in QA Operations.

## Technical details

- `src/components/admin/QAOperationsQueue.tsx`: extend `isQaHold` to require an actionable
  appointment (non-terminal status, not superseded, `review_status` not in
  oon/declined/dismissed, appointment date not in the past); it already receives `status`
  in the enrichment select — add `review_status`, `is_superseded`, `date_of_appointment`
  to that select and to the single-row refresh queries.
- The Review Queue QA Hold list (read-only) uses the same predicate, so it stays in sync.
- Migration: trigger on `all_appointments` that stamps `potential_oon_resolved_at` /
  `potential_oon_resolution` when an unresolved flagged row transitions to a terminal
  status or to `review_status` in ('oon','declined','dismissed').
- One-off data update for the currently stuck rows.
- No new tables or columns.
