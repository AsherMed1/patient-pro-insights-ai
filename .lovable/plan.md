# Dejan Petkovski duplicate — Texas Endovascular - Houston Vein Clinic

## What's in the database

Two active rows exist for GHL contact `kWuGoUwtcVg8m6jd1vWt`, both on the FSE Houston (Bellaire) calendar:

| Portal ID | Appointment | GHL event | Created | Status | Superseded |
|---|---|---|---|---|---|
| 61714adc | Sep 24, 1:00 PM | 1UXzeopr… | Aug 16, 02:13 | Scheduled | no |
| 51e1e13a | Aug 19, 9:30 AM | FNBQPccj… | Aug 16, 14:09 | Cancelled | no |

## What happened (from the record's own notes)

1. Row 61714adc started as the **Aug 19, 9:30 AM** booking and was correctly rescheduled in place to **Sep 24, 1:00 PM** ("Rescheduled | FROM 2026-08-19 09:30 | TO 2026-09-24 01:00 PM | By: GoHighLevel", Aug 16 12:16).
2. Two hours later GHL sent the **original Aug 19 9:30 booking again under a new event ID** (`FNBQPccj…`). The webhook had no rule to reject it, so it created row 51e1e13a and auto-approved it as setter-submitted. That is the duplicate the clinic saw.
3. On Aug 17 the team cancelled the duplicate ("Notes: DUPLICATE"). Eleven seconds later the **real Sep 24 row flipped to Cancelled via GoHighLevel**, and it had to be manually set back to Scheduled at 15:49.

So the duplicate is resolved on the surface, but it also briefly cancelled the patient's live appointment — the exact risk flagged earlier.

## Root cause (confirmed in code)

`supersedeOlderContactRows()` in `ghl-webhook-handler` only ever retires *older* siblings; the **incoming** booking is always assumed to be the winner. When GHL replays a stale, earlier-dated booking under a fresh event ID for a contact that already holds a newer active booking, nothing suppresses the incoming row, so it lands as a second active appointment.

The cancel-echo is a second, related issue: the portal cancels the correct event ID (`FNBQPccj…`), but GHL still ended up cancelling the contact's live appointment and echoed it back onto row 61714adc. Whether GHL treats the replayed event as the same underlying appointment is **not yet confirmed** — verifying that is step 1 below.

## Fix

1. **Reject stale replays at create time.** Before inserting a new row, check for an active, non-terminal row for the same contact + project. If the incoming booking is dated *earlier* than the existing active booking and the existing row already carries a reschedule that moved it off the incoming date/time, treat the incoming event as a replay: attach the new event ID to the existing row (or mark the new row superseded immediately) instead of creating a live duplicate. Genuine second bookings — a real earlier appointment with no matching reschedule history — still create a row for human review.
2. **Verify the GHL cancel behavior before changing it.** Pull the GHL event history for both IDs and confirm whether cancelling one cancels the other. If they are the same underlying appointment, block the outbound cancel whenever the row being cancelled is a known duplicate of a newer active booking, and cancel only in the portal.
3. **Guard the echo either way.** When a GHL cancellation arrives for a row whose sibling was cancelled in the portal seconds earlier, ignore it instead of flipping the live booking to Cancelled — reuse the existing 120s echo-back debounce, keyed on contact rather than event ID.
4. **Retire this record's duplicate.** Mark 51e1e13a `is_superseded = true` with a note pointing at the Sep 24 booking, so it stops showing next to the live appointment. No deletion.
5. **Report first.** Run the existing duplicate scan for other contacts holding one active row plus a same-contact replay row, and list them before applying any sweep.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: add a `suppressStaleReplay()` check in the create path (before the insert around line 391) mirroring the sibling query in `supersedeOlderContactRows()`; on match, either patch `ghl_appointment_id` onto the surviving row or insert with `is_superseded = true` plus an audit note.
- Echo guard lives in the existing terminal-status handling near line 2289; extend the debounce lookup from `ghl_appointment_id` to `ghl_id + project_name`.
- `src/utils/appointmentStatusChange.ts` already passes `skipGhlSync`; the duplicate-cancel path should set it once step 2 confirms the shared-appointment behavior.
- Cleanup touches `is_superseded` and `appointment_notes` only — no schema change, no deletions.
