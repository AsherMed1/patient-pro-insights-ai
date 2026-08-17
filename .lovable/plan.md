# Prospero booked-date fix — GHL is the authority, notes are only a fallback

## What your screenshot changes

James Hendrix (`4b42aa7f`) has a real GHL appointment: **Fri, Aug 21 2026, 1:45 pm PDT**, Confirmed, Hayward CA. His intake notes say `Date Appt Booked For: August 17, 2026`. The notes value is **stale** — it records what the setter typed at intake time, not the appointment that actually exists now.

That invalidates the "trust the notes" backfill for any record that already has a live GHL appointment. Writing Aug 17 to James would have put a wrong date in the portal.

## Revised rule

Notes are a fallback, never an override:

1. **Ask GHL first.** For each affected row, look up the contact's appointments in GHL (`fetch-ghl-contact-data` / `backfill-ghl-appointment` path).
2. **If GHL has an appointment** → use GHL's date, time, calendar and `ghl_appointment_id`. Set `is_unscheduled = false`, clear `time_preference`. The notes value is ignored entirely.
3. **If GHL has no appointment** → fall back to the `Date Appt Booked For` value from the notes, with all the safety guards (exact label only, four accepted formats, plausibility window, never overwrite an existing date, skip terminal / superseded / declined rows), and leave `requested_time` null.
4. **If neither** → row stays unscheduled exactly as today.

## Prospero rows, revised

| Patient | Notes say | GHL says | Action |
| --- | --- | --- | --- |
| James Hendrix (4b42aa7f) | Aug 17 2026 | Aug 21 2026 1:45 pm PDT, Confirmed | Use GHL — Aug 21, with time and appointment ID |
| Sean Eldridge (6312f2a0) | Aug 31 2026 | to be checked before writing | GHL if present, else notes fallback |
| Geray Dos Passos (cc1f791c) | Aug 17 2026 | n/a | Skipped — Cancelled (terminal) |

Nothing is written for Sean until the GHL lookup returns; if GHL shows a different date than Aug 31, GHL wins.

## Webhook change (going forward)

The `ghl-webhook-handler` promotion keeps the same precedence: a date in the GHL payload always wins; the notes fallback only fires when the payload carries no date **and** the row has no date and no `ghl_appointment_id`. That way a stale intake line can never overwrite a live GHL booking.

## Then: the 2026-only report

For ECCO Medical, Premier Vascular and Davis Vein & Vascular I'll produce a read-only list (no writes) of unscheduled, dateless rows whose notes hold a 2026 `Date Appt Booked For` value — with a **GHL check column** showing what GHL actually has for that contact, so we can see how many of the notes dates are stale like James's before deciding anything.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: `extractBookedDateFromNotes` helper plus create/update promotion, gated behind "no payload date, no existing date, no `ghl_appointment_id`", with terminal/superseded/declined guards.
- Backfill runs per-row: GHL contact appointment lookup first, then an explicit `UPDATE ... WHERE id = ... AND date_of_appointment IS NULL`. No bulk project-wide update.
