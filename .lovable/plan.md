# Shunn Morrise reschedule — finish the move and stop the silent "failed" toast

## What the records show

Verified in the database for Shunn Morrise (Nashville Vascular & Vein Institute, portal ID `378216a1`):

- The appointment **is now** on Wed 8/5 at 1:40 PM, and the GoHighLevel sync for that change is recorded as successful (16:40 UTC today).
- Five earlier attempts between 15:10 and 15:13 today created reschedule-request rows but never touched the appointment — that matches the "it says failed" the setter saw and her note: "8/3 gm would not let me reschedule kept saying failed."
- The calendar on the record — and in GHL — is still **"Request Your GAE Consultation at Nashville, TN"**. Nothing has moved it yet. The project does have a "Request Your GAE Consultation at Hendersonville, TN" calendar, and you confirmed Hendersonville is the correct destination.
- All six reschedule-request rows are still marked "pending / not processed", including the one that succeeded.

Root cause of the 15:10–15:13 failures is **not confirmed** — the portal's error message discards the real database error, so nothing was recorded. The most likely candidate is the recapture trigger bug fixed earlier today (it raised "invalid input syntax for type uuid" on appointment updates), which would explain why the same action succeeded at 16:40. Confirming this is the first step below, not an assumption.

## Plan

1. **Finish this patient's move (data fix).** Switch Shunn Morrise's appointment to the Hendersonville, TN GAE calendar, push the calendar transfer to GoHighLevel so the clinic's calendar matches, and add an audit note recording the location change (date/time 8/5 1:40 PM stays as-is). Verify afterwards that GoHighLevel shows one appointment: Wed 8/5, 1:40 PM, Hendersonville.
2. **Confirm the failure cause.** Re-run the exact same update path against a scratch record to check whether the recapture trigger fix removed the error. If a different error surfaces, fix that instead.
3. **Stop swallowing the error.** The reschedule dialog currently shows a generic "Failed to reschedule appointment" with no detail. Show the actual error text in the toast and log it onto the reschedule-request row, so the next occurrence is diagnosable instead of guesswork.
4. **Close the bookkeeping gap.** Successful reschedules currently leave their request row stuck at "pending / not processed" (the status write fails silently). Make that write's failure visible and ensure a successful reschedule marks the row processed.

## Technical notes

- Data fix: update `all_appointments.calendar_name` for `378216a1-e85b-4b15-9b2a-fd76aabc5aac`, then invoke `update-ghl-appointment` with `calendar_id` for the Hendersonville calendar (calendar transfer path already supported in that function), plus an `appointment_notes` audit row.
- Error surfacing: `handleRescheduleSubmit` in `src/components/appointments/AppointmentCard.tsx` (outer catch at ~line 1113) replaces the hardcoded description with `error.message`; the same for the `appointment_reschedules` update results, which are currently unchecked.
- No schema changes required.
