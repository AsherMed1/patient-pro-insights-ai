Update ESIQUIA C DELAGARZA's time preference to Morning only.

## What we're doing
- Target record: `all_appointments.id = '99db03d4'` (ESIQUIA C DELAGARZA, Davis Vein & Vascular)
- Change: set `time_preference = 'morning'`
- Constraint: no other fields will be modified

## Verification
- Query the row before and after to confirm only `time_preference` changed and the value is `morning`.

## No code changes required
This is a single-field data update; no application code or schema changes are needed.