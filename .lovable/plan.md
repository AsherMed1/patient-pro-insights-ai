# Portal OON status must stop cancelling the GHL appointment

## Root cause (matches your Review Queue test)

Your GHL workflow `OON PT - Cancel Appt in future` fires on **Appointment status = confirmed** AND **has tag `oon pt`**, and it is the step that updates the appointment status and sends the patient the OON SMS.

The two Portal OON paths behave differently:

- **Review Queue → Mark OON** (works, as you saw on Test Johann in Liberty Medical): sets `review_status = 'oon'`, writes the note, fires `notify-slack-oon`, fires `appointment-status-webhook` to the project's GHL inbound webhook, and adds the `appointment-oon` exit tag. It **never cancels the GHL appointment**. So GHL still sees a confirmed appointment when `oon pt` lands, the OON workflow fires, and GHL cancels the appointment itself.
- **Portal status dropdown → OON** (broken): before the webhook lands, it calls `update-ghl-appointment`, whose `STATUS_MAP` maps `OON → cancelled`. The appointment is already cancelled in GHL, so when the workflow evaluates `Appointment status is confirmed` the filter fails, no OON SMS goes out, and the plain cancellation is what pulled the opportunity into the Needs to Reschedule workflow instead.

So this was never a removed tag — the dropdown path has always pre-cancelled the appointment out from under the OON workflow.

## Fix

Make the dropdown path behave like the Review Queue path for OON.

1. In `src/utils/appointmentStatusChange.ts`, when `status === 'OON'`, **skip the direct GHL appointment-status push** (no `update-ghl-appointment` call). GHL's `OON PT - Cancel Appt in future` workflow owns cancelling/releasing the slot.
2. Keep everything else in order: portal status becomes `OON`, status-change note, `notify-slack-oon`, and `appointment-status-webhook` (the webhook is what puts `oon pt` on the contact through your GHL automation).
3. Add the `appointment-oon` exit tag on this path too, so the dropdown and the Review Queue leave GHL in an identical state.
4. Write an internal audit note stating the appointment was intentionally left confirmed in GHL so the OON workflow can cancel it, and drop the misleading "GHL Sync Warning" toast for OON.
5. Safety net: if the project has **no** `appointment_webhook_url`, the tag can never arrive from GHL — in that case push `oon pt` to the contact directly via `update-ghl-contact-tags` so the workflow still fires. (Verified both Liberty Medical and Texas Endovascular do have a webhook URL configured.)

`Cancelled`, `Do Not Call`, `Referral Requested` and all other statuses keep their current GHL appointment behavior — only OON changes.

## Recovery for the affected patient

For the patient you already cancelled manually: the appointment is cancelled in GHL, so the workflow filter can no longer match. Options, in order of preference:

1. Send the OON message from GHL manually for that one contact, or
2. Re-fire the Portal OON (after the fix) on a record whose GHL appointment is still confirmed.

Tell me the patient's name and clinic and I'll confirm what state their GHL appointment and tags are in before choosing.

## Verification after the fix

Repeat your Test Johann flow, but from the Portal status dropdown instead of the Review Queue:
- GHL appointment should stay `confirmed` right after the Portal save
- `oon pt` should land on the contact
- `OON PT - Cancel Appt in future` should show an enrollment, cancel the appointment, and send the SMS
- The opportunity should not enter Needs to Reschedule

## Technical details

- Files: `src/utils/appointmentStatusChange.ts` (skip the OON appointment push, add the exit tag + fallback tag, audit note).
- No change to `update-ghl-appointment`'s `STATUS_MAP` — the OON path simply stops calling it.
- No schema changes; reuses `update-ghl-contact-tags` and `appointment-status-webhook`.
- Memory rule to add: OON is workflow-owned in GHL. The Portal must never push a GHL appointment cancellation for OON — cancelling before `oon pt` lands breaks the `Appointment status is confirmed` filter and routes the patient into Needs to Reschedule.
