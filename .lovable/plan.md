# Remove Joe Hernandez duplicate (Aug 4) from the portal

## What's in the database now

Two active rows exist for the same GHL contact (`AXV2Z0rXgUGGQHLyIKGQ`) at Texas Endovascular - Houston Vein Clinic:

| Portal ID | Appointment | GHL event ID | Status | Created |
|---|---|---|---|---|
| c40d0813 | Aug 04, 2026 2:00 PM | WuL654Da2aFbcZw2wjKz | Confirmed | Aug 03 15:46 |
| b3892e35 | Aug 11, 2026 2:30 PM | XyCgmHZY2kGEPRIyXr7F | Confirmed | Aug 03 18:04 |

Both are `is_superseded = false`, `review_status = approved`, which is why both show under the New tab. The reschedule produced a new GHL event ID, so the portal treated it as a second booking instead of a replacement.

## Immediate fix

Retire the Aug 4 row (c40d0813):
- Set `is_superseded = true` and status `Rescheduled` so it drops out of New/Needs Review and lands in Completed history.
- Write an appointment note recording that it was superseded by the Aug 11 booking (portal ID b3892e35), attributed to Support.
- Leave the Aug 11 row untouched — it stays the single active appointment.
- No GHL write: GHL already has only the Aug 11 event.

## Root-cause check (verify, then decide)

The "one active row per contact" supersede logic should already have retired the older row when the Aug 11 booking arrived. Before changing any handler code, confirm from the webhook logs for this contact whether:
1. the reschedule arrived as a new-booking event with a fresh event ID (so no existing row matched), and
2. the supersede step ran but skipped, or never ran.

If it confirms that a new GHL event ID for the same contact bypasses the supersede path, follow up by extending `ghl-webhook-handler` so that when a new active appointment is created for a contact, any older non-terminal row for that contact is marked superseded regardless of event ID. That code change is a separate step after the data fix, not part of it.

## Technical notes

- Data fix is a single targeted UPDATE against `all_appointments` plus one `appointment_notes` insert; no schema change.
- No client-side code changes needed for the immediate removal — the portal already filters `is_superseded` rows out of client views.
