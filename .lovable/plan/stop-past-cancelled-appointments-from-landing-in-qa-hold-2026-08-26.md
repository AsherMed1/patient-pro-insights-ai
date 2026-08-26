# Stop past/cancelled appointments from landing in QA Hold

## What's happening

`evaluate-potential-oon` re-evaluates an appointment's insurance whenever the row is
re-parsed or touched by a GHL webhook. It has no guard on appointment status or date,
so an appointment the clinic already cancelled — even one whose date has passed — gets
flagged `potential_oon`, pulled from `approved` back to `review_status='pending'` +
`review_stage='qa_hold'`, and re-surfaced in the Review Queue.

Confirmed examples (both Liberty Medical, both `status='Cancelled'`, appointment date
Aug 20, 2026 — already in the past):

- Janette Montalvo — flagged Aug 26 17:18, now `pending` / `qa_hold`
- Carlos Valerio — flagged Aug 26 17:12, now `pending` / `qa_hold`

Both were previously approved and worked; the re-flag reopened them.

## Fix

1. **Skip terminal and past appointments in `evaluate-potential-oon`.**
   Before flagging, bail out when:
   - `status` is a terminal status (Cancelled, No Show, Showed, Won, OON, Do Not Call, Rescheduled)
   - the appointment date is in the past
   - the row is `is_superseded`, or `review_status` is `declined` / `dismissed` / `oon`

   Result reported as `skipped` with a reason, so the caller logs why. Purely a
   pre-flag guard — nothing already correctly held changes.

2. **Never demote an approved row that is no longer actionable.**
   The `review_status = 'pending'` + `qa_hold` demotion only applies when the row is
   still live (non-terminal, future date). If a match is found on a live row, behaviour
   is unchanged.

3. **Clean up the rows already stuck.**
   For appointments currently in `qa_hold` whose status is terminal and whose date has
   passed, restore `review_status='approved'`, clear `review_stage`, and stamp
   `potential_oon_resolved_at` so they don't get re-flagged. An internal note records
   the correction. Scoped to exactly those rows — active QA Hold records are untouched.

## Technical details

- `supabase/functions/evaluate-potential-oon/index.ts`: add a
  `TERMINAL_STATUSES` set and an `isActionable(appt)` check ahead of the match
  evaluation loop's flag/update block; return `{ skipped: true, reason }`.
- Existing QA Operations cases created for these rows are left as-is (QA can close
  them); no `qa_cases` writes in the cleanup.
- No schema changes.
