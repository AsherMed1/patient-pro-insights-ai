# Wilfredo De Mesa — restore the 2:30 PM appointment and stop same-day merges from picking the wrong row

## What the data shows

Two rows exist for this contact (`XrNHOvCBXHlsxFJckaJt`) at Naadi Healthcare, both for Aug 31:

| Portal ID | Time | Created | Status | Review | Superseded |
|---|---|---|---|---|---|
| e7d16672 | 2:30 PM | Aug 4, 18:00:20 | Confirmed | dismissed | yes |
| ad77173c | 12:30 PM | Aug 4, 18:00:22 | Cancelled | approved | no |

Both arrived from GHL two seconds apart. A setter approved the **12:30 PM** row in the Review Queue at 18:09:45; the approval merge immediately retired the 2:30 PM row ("Superseded by newer approved appointment…"). When the 12:30 PM row was later cancelled in GHL (Aug 5, 4:39 PM), the contact was left with one visible row, cancelled — and the surviving 2:30 PM booking hidden.

## Root cause (confirmed)

`public.merge_older_active_siblings()` decides which sibling is "older" by **row creation order plus appointment date only** (`older.created_at < new_row.created_at` and `older.date_of_appointment <= new_row.date_of_appointment`). It never compares `requested_time`. When two bookings land on the same date, whichever row happens to be inserted last wins — here that was the earlier 12:30 PM slot, so the correct 2:30 PM booking was retired.

## Fix

1. **Restore Wilfredo now.** Un-supersede the 2:30 PM row (e7d16672), set `review_status` back to `approved` so it shows in the portal, and add an audit note explaining the manual restore. Leave the 12:30 PM row as cancelled and mark it superseded so only one active row remains.
2. **Make the merge time-aware.** In `merge_older_active_siblings()`, when the two rows share a `date_of_appointment`, compare `requested_time` instead of insert order: only retire a sibling whose date+time is at or before the approved row's date+time. Rows on the same date with a *later* time are no longer treated as older.
3. **Never retire a sibling that a human hasn't reviewed against the winner.** When the sibling is same-date and its time is later than the approved row's, leave it pending in the Review Queue so the setter explicitly picks which slot stands, instead of the system silently choosing.
4. **Audit note names the times.** Both the "Superseded by…" and "Replaced N earlier record(s)" notes should include the appointment time, so a clinic can see which slot was retired.
5. **Sweep report.** List contacts where a same-date sibling was superseded by an approved row at an *earlier* time (the same failure mode), and report before changing anything.

## Technical notes

- Migration rewrites `public.merge_older_active_siblings(all_appointments)`: replace the `older.date_of_appointment <= new_row.date_of_appointment` predicate with a combined comparison of `(date_of_appointment, COALESCE(requested_time,'00:00'))`, keeping NULL-date handling as-is. Triggers `trg_supersede_on_review_approval` and `trg_supersede_on_approved_insert` are unchanged.
- The same date+time ordering already applied to `supersedeOlderContactRows()` in `ghl-webhook-handler`; this brings the approval-time path in line with it.
- Restore step touches only `is_superseded`, `review_status`, and `appointment_notes` — no schema change.
