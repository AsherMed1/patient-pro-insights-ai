# Prospero backfill — who gets touched and why it's safe

## Who is 4b42aa7f?

**James Hendrix** — Prospero Vascular and Interventional, phone +1 510-789-8969, created Jul 28 2026, calendar "Request your GAE Consultation at Hayward, CA". Currently unscheduled, no appointment date, no time preference, status **Welcome Call**, review status approved, not superseded. His intake carries `Date Appt Booked For: August 17, 2026` — which is today.

## The three Prospero rows and the decision for each

| Patient | Booked date in notes | Status | Action |
| --- | --- | --- | --- |
| Sean Eldridge (6312f2a0) | August 31, 2026 | Confirmed | Promote — set date, clear unscheduled, clear "no_preference" |
| James Hendrix (4b42aa7f) | August 17, 2026 | Welcome Call | Promote — same |
| Geray Dos Passos (cc1f791c) | August 17, 2026 | **Cancelled** | **Skipped** — terminal status, left untouched |

## Why the write is safe

- Only these two IDs are updated — the statement targets them explicitly, no bulk `WHERE project = ...` update.
- Each update carries `AND date_of_appointment IS NULL`, so it can never overwrite a date that arrived in the meantime.
- Cancelled/terminal and superseded rows are excluded; Geray Dos Passos is the only terminal one and is skipped.
- Only three columns change: `date_of_appointment`, `is_unscheduled = false`, `time_preference = NULL`. Status, notes, review status, GHL IDs, insurance data are untouched.
- No time is invented — `requested_time` stays null, so the record shows a date with no time rather than a wrong time.
- Nothing is pushed to GHL by this write; it is a portal-side data correction only.

One thing to confirm before applying: James Hendrix's booked date is **today (Aug 17)**. Promoting him puts a same-day appointment on the calendar, which will make him eligible for short-notice logic. If you'd rather leave him alone and only fix Sean, say so and I'll drop him from the update.

## Then: the 2026-only report

After the Prospero write, I'll produce a read-only list — no writes — for ECCO Medical, Premier Vascular and Davis Vein & Vascular of every unscheduled row with no date whose intake has a `Date Appt Booked For` value **in 2026 only** (2025 rows excluded), showing patient, project, created date, current preference, current status, and the date that would be applied.

## Technical notes

- Code change to `supabase/functions/ghl-webhook-handler/index.ts` is already written (new `extractBookedDateFromNotes` helper plus create/update path promotion, with the terminal / superseded / declined guards); it still needs to deploy.
- The backfill runs as a migration with the two explicit `UPDATE ... WHERE id = ... AND date_of_appointment IS NULL` statements.
