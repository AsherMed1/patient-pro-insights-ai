# Fix Review Queue Decline: GHL cancellation + reschedule choice

## What's broken (verified on Fahrije Saiti)

Portal row `cd13e86c` — status `Cancelled`, `review_status = declined`, `decline_notified_at` set — but GHL still shows the Aug 25 appointment as **Confirmed**.

Cause: the decline flow only pushes the cancellation to GHL when the portal row is not already "Cancelled". This patient was already flipped to Cancelled by a GHL webhook at 11:47 AM; GHL then re-confirmed the appointment (opportunity moved "Needs to Reschedule → Confirmed"). When the setter declined at 1:15 PM the portal saw "already Cancelled" and skipped the GHL push entirely, so the event stayed Confirmed and no cancellation-driven message fired.

Second gap: the notification tags (`appointment-declined`, the reason tag, and `declined-reschedule` / `declined-no-reschedule`) are pushed once and then permanently suppressed by `decline_notified_at`, even if that first push failed. There is no confirmation that GHL actually accepted them.

Third gap: whether a patient should be rescheduled is hard-coded per reason. Only "Other" lets the setter choose.

## Changes

**1. Always cancel in GHL on decline**
- Remove the "skip if already cancelled" shortcut. Every decline pushes `status: Cancelled` for the appointment to GHL, regardless of the portal's current status.
- After the push, read the appointment back from GHL and confirm it is cancelled. If it isn't, retry once, then show a loud red toast ("Declined — GHL appointment NOT cancelled") and write an internal note so it's visible on the record instead of silently drifting.
- Write a note recording the verified outcome ("GHL appointment cancelled — verified" or the failure text).

**2. Reschedule Yes/No on every decline reason**
- The decline dialog gains a required "Does this patient need to be rescheduled?" Yes / No choice shown for every reason (not just "Other"). It pre-selects the sensible default for the picked reason (e.g. "No longer interested" → No, "Missing insurance" → Yes) and the setter can override it.
- The stored decline reason, the portal note, the GHL contact note and the reschedule tag all follow the setter's choice.

**3. Reliable tagging**
- Push tags on every decline attempt; `decline_notified_at` records success only, and a failed push is retried on the next decline/retry instead of being suppressed.
- Remove the opposite reschedule tag before adding the new one so a contact can never carry both `declined-reschedule` and `declined-no-reschedule`.
- Surface the exact GHL error text in the toast when a push fails.

**4. Repair Fahrije Saiti now**
- Re-push the cancellation and the correct decline/reschedule tags for that contact so the appointment cancels in GHL and the clinic workflow fires.

## Technical notes

- `src/components/admin/ReviewQueue.tsx` — `performAction` decline branch: unconditional GHL cancel via `changeAppointmentStatus` (with a direct `update-ghl-appointment` fallback when the portal row is already Cancelled), post-push verification through `verify-ghl-appointment-status`, tag push no longer gated on `decline_notified_at`.
- `src/components/admin/declineReasons.ts` — `reschedulable` becomes the default for the dialog toggle rather than a fixed value; `resolveDeclineReasonValue` extends so any reason can store a reschedule / no-reschedule variant.
- No schema changes: `decline_reason`, `review_notes`, `decline_notified_at` already carry everything needed.
- SMS/email content stays in GHL workflows, keyed on `appointment-declined` + `declined-reschedule` / `declined-no-reschedule`.
