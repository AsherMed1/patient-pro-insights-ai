# Richard Schmied duplicate — what happened and how to stop it

## What's in the database

Three rows exist for the same GHL contact (`MvW5kgPs1Va6WZBShOC0`) at Vascular and Embolization Specialists:

| Portal ID | Appointment | Created | Status | Review | Superseded |
|---|---|---|---|---|---|
| 517f3124 | Jun 30, 10:30 AM | Jun 04 | Cancelled | approved | yes |
| 44c91f58 | Aug 05, 10:30 AM | Jul 28 | Cancelled | approved | no |
| c4f99888 | Aug 05, 9:30 AM | Jul 31 | Cancelled | dismissed | yes |

The two Aug 5 rows are the duplicate the clinic saw: the Jul 31 booking was a same-day time change (10:30 → 9:30) that GHL sent with a **new event ID**, so the portal created a second row instead of replacing the first.

Both Aug 5 rows were cancelled this morning (11:32 UTC) and the 9:30 row was dismissed, so **no active duplicate remains right now** — the contact has one non-superseded row (44c91f58, Cancelled). Nothing needs deleting; the open item is the root cause.

## Root cause (confirmed)

`supersedeOlderContactRows()` in `ghl-webhook-handler` retires an older still-open sibling only when its date is **strictly before** the new booking's date. A reschedule to a different time on the **same date** fails that test, so the older row survives and both show in the portal. Same-day time moves are exactly the common case here.

## Fix

1. **Compare date + time, not just date.** When deciding whether an older open sibling is "before" the new booking, use `date_of_appointment` combined with `requested_time`. A same-date, different-time booking for the same contact then retires the older row, whichever direction the time moved.
2. **Same-date, same-contact rule.** When the new booking and the older open row share a date and the older row is not pending review, treat the newer booking as the replacement and supersede the older one — a contact should never hold two open rows for the same day at one clinic.
3. **Apply the same date+time comparison to the approval-time merge** (`merge_older_active_siblings`), so Review Queue approvals de-duplicate same-day reschedules identically.
4. **Keep pending-review rows untouched** at webhook time, as today — setters still see both entries in the queue until one is approved.
5. **Audit note on every retire**, naming the replacing booking's date, time and event ID, so the clinic can see why a row disappeared.
6. **One-time sweep**, report first: find contacts with more than one active, non-terminal row on the same date at the same project, and retire the older one after review.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`, `supersedeOlderContactRows()`: replace the `String(r.date_of_appointment) < newDate` check with a combined `date + requested_time` comparison, falling back to `created_at` order when a time is missing. Reserved blocks and `review_status='pending'` stay excluded.
- `public.merge_older_active_siblings()`: mirror the same date+time ordering in its sibling filter.
- No schema change; the sweep touches only `is_superseded` plus `appointment_notes` inserts.
