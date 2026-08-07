# Stop patients appearing twice in the portal

## Miguel Espinoza — already resolved, but it shows the gap

Two rows exist for this contact at Texas Endovascular - Dallas Vein Clinic, both created Jul 25 seconds apart:

| Portal ID | Appointment | Status | Superseded |
|---|---|---|---|
| dc2fd097 | Aug 4, 3:30 PM | Cancelled | yes (manual cleanup Jul 30) |
| 35b12202 | Aug 7, 8:30 AM | Scheduled | no |

Only one row is active today, so the clinic view is correct now. It was fixed by a manual "duplicate cleanup" note on Jul 30 — the automatic approval-time merge did not exist yet at that point. No further action needed for Miguel.

## The one live duplicate still in the system

**Susannah Teeters — Richmond Vascular Center.** Three rows share the *same* GHL event ID `7sLpqzlFG2EC1s829ZGw`:

| Portal ID | Appointment | Created | Review | Superseded |
|---|---|---|---|---|
| b4614a6e | Aug 14, 3:00 PM | Jul 29 | declined | yes |
| 27dd3cb9 | Aug 14, 3:00 PM | Aug 4, 14:41 | approved | no |
| 99ae98f4 | Aug 12, 3:00 PM | Aug 4, 14:54 | approved | no |

Two active rows for one booking. This is the case the clinic is describing.

## Root cause (confirmed)

The webhook looks up an existing row by GHL event ID with a **single-row** query. That is safe only while one row per event ID exists. Once a Review Queue decline creates a second row for the same event ID (by design — declined rows are frozen snapshots), the lookup no longer returns exactly one row, it fails, and the webhook concludes "no match" and **inserts another row**. Every later edit for that booking repeats the process. Susannah's Aug 12 row is exactly that: a reschedule of the same event that became a new row instead of updating the existing one.

A second, smaller gap: the approval-time merge only retires an older sibling whose date is at or before the new booking. Susannah's newer row moved *earlier* (Aug 14 → Aug 12), so the stale Aug 14 row was never retired.

## Fix

1. **Make the event-ID lookup duplicate-proof.** Fetch all rows for that event ID and project, ignore declined/dismissed snapshots, and pick the newest remaining active row to update. Only insert a new row when nothing usable is left. This removes the failure that manufactures duplicates.
2. **Self-heal on the way through.** When the lookup finds more than one active row for one event ID, retire all but the chosen one and write an audit note naming the surviving booking, so an existing mess resolves itself on the next GHL edit instead of growing.
3. **Retire same-contact siblings when a booking moves earlier.** For rows sharing the *same GHL event ID*, the newest row always wins regardless of date direction — a single event cannot legitimately hold two dates. Same-contact/different-event rows keep the current, more cautious date+time rule so genuine second bookings still get human review.
4. **Clean up Susannah now.** Retire the stale Aug 14 row (27dd3cb9) so only the Aug 12, 3:00 PM booking is active, with a note explaining the merge.
5. **Ongoing detection.** Add a lightweight recurring check that reports contacts holding more than one active, non-terminal row at the same clinic, so the next occurrence surfaces before a clinic reports it.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`, `findExistingAppointment()`: replace the `.eq('ghl_appointment_id', …).maybeSingle()` branch with an ordered `select` + client-side pick; keep the existing declined/dismissed supersede behavior, and supersede extra active siblings sharing the event ID.
- Same-event-ID precedence is handled in the webhook; `public.merge_older_active_siblings()` keeps its current date+time predicate for different-event siblings (unchanged behavior from the Wilfredo De Mesa fix).
- Cleanup touches only `is_superseded` plus `appointment_notes` inserts — no deletions, no schema change.
- A partial unique index on `(ghl_appointment_id, project_name)` for non-superseded rows is deliberately *not* added: declined snapshots and reserved blocks legitimately share IDs, and a hard constraint would reject webhooks instead of healing them.
