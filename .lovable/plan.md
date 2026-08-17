# Booked-Date Promotion: Close Out

## Decision

No historical backfill. The 10 past-dated candidate rows across ECCO Medical, Premier Vascular, and Davis Vein & Vascular stay as they are.

## What is already live

The GHL webhook handler promotes a lead's "Date Appt Booked For" intake value into a real appointment date only when all of these hold:

- the project is an unscheduled-capture project (Prospero, ECCO, Premier, Davis)
- the webhook payload carries no calendar slot
- the row has no existing date and no GHL appointment ID
- the row is not terminal, superseded, declined, or dismissed
- the parsed date is a valid calendar date within 1 year back to 2 years ahead

Any live GHL appointment always wins over the intake line, so a stale note can no longer overwrite a real booking.

## Already applied (Prospero)

- James Hendrix set to Aug 21, 2026 1:45 pm from GHL
- Sean Eldridge set to Aug 31, 2026 2:00 pm from GHL
- Geray Dos Passos skipped (cancelled in GHL)

## Remaining work

None. No code or data changes to make. New leads are covered by the deployed logic; the historical rows are left untouched by decision.
