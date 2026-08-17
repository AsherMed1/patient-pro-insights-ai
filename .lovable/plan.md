# Promote "Date Appt Booked For" into the appointment date for unscheduled projects

## What's wrong

Sean Eldridge (Prospero Vascular and Interventional) shows "No preference" and no appointment date. His GHL intake has no `Time Preference` field at all — the portal falls back to the `no_preference` default. But the intake *does* carry `Date Appt Booked For: August 31, 2026`, which the portal currently ignores because unscheduled-capture projects deliberately drop any date.

Giuliana Allen is correct already (`Time Preference: Morning` in her intake, `morning` stored) — no change needed for her.

## Prospero is not the only clinic affected

Unscheduled rows with no date whose intake contains a `Date Appt Booked For:` value:

| Project | Unscheduled rows with no date | Affected |
| --- | --- | --- |
| ECCO Medical | 148 | 50 |
| Premier Vascular | 77 | 23 |
| Davis Vein & Vascular | 75 | 19 |
| Prospero Vascular and Interventional | 4 | 3 |
| Horizon Vascular Specialists | 48 | 0 |

95 rows in total. Many of the ECCO/Premier ones point at dates in 2025 — old leads that were never actually scheduled — so the backfill has to be reviewed rather than applied wholesale.


## The fix

For unscheduled-capture projects (Premier Vascular, ECCO Medical, Davis Vein & Vascular, Horizon Vascular Specialists, Prospero Vascular and Interventional), when the GHL payload carries no calendar date but the intake notes contain an explicit `Date Appt Booked For:` value, treat that value as the real appointment date instead of capturing a time preference.

Behavior:
- New lead: store `date_of_appointment` from the parsed value, `is_unscheduled = false`, `time_preference = null`. Everything else (status Confirmed, review queue routing) is unchanged.
- Existing unscheduled row that later receives an intake with a booked date: promote it the same way (fill the date, clear the unscheduled flag and preference). Records already carrying a real date are never touched.
- No booked date in the notes: current behavior stays exactly as today (unscheduled + preference / `no_preference`).

## Safety rules (deliberately conservative)

- Only the exact labeled field `Date Appt Booked For:` is read. No guessing from free text, no other date labels.
- Accepted formats only: `August 31, 2026`, `Aug 31 2026`, `2026-08-31`, `08/31/2026`. Anything unparseable is ignored.
- Plausibility window: the date must fall between 1 year ago and 2 years ahead. Anything outside is ignored and logged.
- Never overwrites a date that already exists on the row.
- Never applied to terminal statuses (Cancelled, No Show, Showed, Won, OON, Do Not Call, Rescheduled), superseded rows, or declined/dismissed review snapshots.
- No time is invented — `requested_time` stays null unless GHL sends one, so the record shows a date with no time rather than a wrong time.
- Scoped to unscheduled-capture projects only; scheduled projects are untouched.

## Backfill — list first, no writes

Before changing any existing data I'll run a read-only report over unscheduled-capture rows whose intake notes contain `Date Appt Booked For:` and show: patient, project, current date/preference, and the date that would be applied. You review that list and approve before any update runs.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`
  - New `extractBookedDateFromNotes(notes)` helper implementing the parsing and plausibility guard above.
  - Create path (`getUpdateableFields`, the `treatAsUnscheduled` branch): when the helper returns a date, set `date_of_appointment`, `is_unscheduled = false`, `time_preference = null`.
  - Update path (`treatAsUnscheduledUpdate` branch): same promotion, guarded by "existing row has no date" plus the terminal/superseded checks.
- No schema changes, no UI changes — `AppointmentCard` and the Review Queue already render a dated record correctly.
