# Portal OON status must trigger the GHL OON workflow

## Confirmed issue

The clinic set the patient to **OON** from the Portal status dropdown, but the GHL OON workflow did not fire because that Portal path was not applying the GHL contact tag your workflow listens for.

From the workflows you found, the required GHL tag is:

```text
oon pt
```

The existing Portal behavior only mapped the appointment status to a GHL appointment cancellation. That released/cancelled the appointment, but without the `oon pt` contact tag, GHL treated it like a normal cancellation/reschedule scenario instead of the OON patient workflow.

## Fix

Update the canonical Portal status-change path so **every time an appointment is set to `OON` from the Portal**, it also updates the GHL contact tags:

1. Add GHL contact tag:
   ```text
   oon pt
   ```
2. Also add the internal branch-protection tag:
   ```text
   do-not-reschedule
   ```
3. Remove any conflicting reschedule branch tag:
   ```text
   reschedulable
   ```
4. Keep existing OON side effects:
   - Portal status becomes `OON`
   - GHL appointment is still cancelled/released
   - OON Slack alert still fires
   - `appointment-status-webhook` still fires
   - status-change note is still written

## Why this prevents the problem

Your GHL workflows are tag-based for the OON patient message. Sending `oon pt` makes the contact enter the OON workflow instead of only being processed as a cancelled appointment.

Adding `do-not-reschedule` and removing `reschedulable` prevents the same contact from also sitting in the Needs to Reschedule branch.

## Recovery for affected patients

Add a small backfill/recovery function for recent OON records that already missed the tag:

- Find recent `all_appointments` records where `status = 'OON'` and a GHL contact ID exists.
- Add `oon pt` and `do-not-reschedule` to the GHL contact.
- Remove `reschedulable` from the GHL contact.
- Write an internal audit note showing the recovery tags were applied.

This can be run for one patient first, then batched for recent OON records if needed.

## Technical details

- Main file to update: `src/utils/appointmentStatusChange.ts`
- Reuse existing `update-ghl-contact-tags` Edge Function.
- No database schema changes required.
- Do not change the GHL appointment-status mapping: OON should still cancel/release the appointment slot in GHL.
- Add a memory rule after implementation: all OON write paths must apply `oon pt` + `do-not-reschedule` contact tags, and remove `reschedulable`.
