# Fix: "invalid input syntax for type uuid" when approving in Review Queue

## What's happening

The approve action writes the review fields to the appointment row. A database trigger that runs on every appointment update — the one that marks a recapture case as recovered when an appointment is linked to a previously lost one — compares the link field incorrectly: it wraps a UUID column in a comparison against an empty text value. Postgres tries to read `""` as a UUID and rejects the whole update, so the setter sees "Action failed — invalid input syntax for type uuid: ''".

Confirmed in the database: `recapture_mark_recovered_on_link()` runs `COALESCE(NEW.recaptured_from_appointment_id, '') <> COALESCE(OLD.recaptured_from_appointment_id, '')`, and its trigger fires `AFTER INSERT OR UPDATE` on all appointments (not just when that column changes).

This is not specific to Kimberly Goodman — it affects any appointment update that hits this code path.

## Fix

1. Migration to replace the trigger function body: swap the `COALESCE(..., '')` comparison for a proper null-safe UUID comparison:
   - `changed := NEW.recaptured_from_appointment_id IS DISTINCT FROM OLD.recaptured_from_appointment_id;`
   - Keep the rest of the function (marking the matching recapture case recovered/completed) unchanged.
2. Narrow the trigger to `AFTER INSERT OR UPDATE OF recaptured_from_appointment_id` so it no longer runs on every unrelated appointment update.
3. Re-verify by approving the affected appointment (Kimberly Goodman, Vascular Surgery Associates of Virginia) and confirming: review status becomes approved, the "approved" GHL tag push runs, and no error toast appears.

## Notes

- No UI/code changes are needed in the Review Queue; the client is sending valid data.
- No data repair required — the failed approvals never wrote, so those rows are still pending and can simply be approved again after the fix.
