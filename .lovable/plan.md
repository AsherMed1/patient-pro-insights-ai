## Root cause

Kenneth Loftly (and Test Johann Booked) lost their appointment date/time because a GHL webhook arrived carrying `date_of_appointment: null` / `requested_time: null`, and the handler treated that as a real reschedule.

DB proof — Kenneth's `reschedule_history` shows exactly one entry:
```
{ previous_date: 2026-07-09, previous_time: 10:00:00, new_date: null, new_time: null,
  changed_at: 2026-07-07T23:29:14Z, previous_status: Scheduled }
```

This was NOT caused by `tryContactNotesSync` (the branch I edited last turn). It was caused by the appointment-update branch in `supabase/functions/ghl-webhook-handler/index.ts` around lines 1082–1150:

```ts
if (webhookData.date_of_appointment !== undefined) {
  updateFields.date_of_appointment = webhookData.date_of_appointment   // null gets written
  if (existingAppointment.date_of_appointment !== webhookData.date_of_appointment) {
    // pushes reschedule_history, resets status to "Confirmed", IPC=false, etc.
  }
}
if (webhookData.requested_time !== undefined) {
  updateFields.requested_time = webhookData.requested_time             // null gets written
}
```

Extractor sets `date_of_appointment` / `requested_time` to `null` (not `undefined`) when the incoming payload has no start time — which is what your GHL "Sync Contact Notes → Portal" workflow (and any other contact-only workflow) sends. Result: the stored date is nuked and the row is recorded as a reschedule to nothing.

## Fix

In `supabase/functions/ghl-webhook-handler/index.ts` (non-unscheduled branch, ~line 1082):

1. Only overwrite `date_of_appointment` when the incoming value is a real date (not null / empty). Same for `requested_time`.
2. Only push a `reschedule_history` entry and reset status/IPC when the incoming date is truthy AND different from the existing date.
3. No other branches change. `tryContactNotesSync` edit from last turn stays as-is.

Effective new guard:
```ts
const incomingDate = webhookData.date_of_appointment
const incomingTime = webhookData.requested_time
const hasRealDate = incomingDate != null && incomingDate !== ''

if (hasRealDate) {
  updateFields.date_of_appointment = incomingDate
  if (incomingTime != null && incomingTime !== '') {
    updateFields.requested_time = incomingTime
  }
  if (existingAppointment.date_of_appointment !== incomingDate) {
    // existing reschedule-history + status/IPC logic runs here, unchanged
  }
} else {
  console.log(`[WEBHOOK] Skipping date/time overwrite — incoming payload has no start time`)
}
```

## Also — one-off data repair

Restore the two rows that were wiped:

- `0cd2c8e5-7d69-4db1-84e1-023162b5edb7` (Kenneth Loftly) → `date_of_appointment='2026-07-09'`, `requested_time='10:00:00'` (from reschedule_history[0].previous_date/time).
- `bb2d7959-68b1-475e-b8f9-de765b113c51` (Test Johann Booked) → confirm expected date/time with you before restoring, since I don't have its prior value in reschedule_history.

Also strip the bogus reschedule_history entry (new_date=null) from Kenneth's row so history stays clean.

## Validation

1. Deploy edge function.
2. Trigger the GHL Notes workflow on a test contact that has an existing date/time — confirm the date/time stays put and no reschedule note is created.
3. Re-check Kenneth Loftly and Test Johann Booked in the portal — dates visible again.
4. Trigger a real GHL reschedule (with a valid new start time) — confirm the reschedule still flows through and reschedule_history logs correctly.
