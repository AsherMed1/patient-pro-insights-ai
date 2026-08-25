# Portal "OON" status must tag the GHL contact

## What happened

The OON tag was never missing "recently" — it only ever existed on **one** of the two OON paths.

- **Review Queue → Mark OON** (admin-only): pushes the `appointment-oon` tag to the GHL contact. Confirmed in `ReviewQueue.tsx`.
- **Portal status dropdown → OON** (what the clinic used): pushes **no contact tag at all**. Confirmed in `src/utils/appointmentStatusChange.ts`, which for OON only does: DB status update, GHL *appointment* status sync, system note, Slack alert (`notify-slack-oon`), and `appointment-status-webhook`.

And because `update-ghl-appointment` maps `OON → cancelled` (verified in its `STATUS_MAP`), the only thing GHL saw was a plain appointment cancellation with no distinguishing tag — so the clinic's generic cancellation / "Needs to Reschedule" workflow picked the contact up, and no OON message went out.

## Fix

Make the portal OON path do exactly what the Review Queue path does, plus suppress the reschedule branch:

1. In `changeAppointmentStatus`, in the existing `status === 'OON'` block, push to the GHL contact via `update-ghl-contact-tags` (project-scoped `ghl_api_key`, same as the Do Not Call block):
   - **add:** `appointment-oon`, `do-not-reschedule`
   - **remove:** `reschedulable` (so the contact can't sit on both branches and re-enter the reschedule workflow)
2. Write an internal audit note with the exact tags applied, and a clear failure note if the push fails (mirrors `pushLifecycleTags`). Never block the status save on a GHL failure.
3. Surface a non-fatal warning to the clinic when the tag push fails ("OON saved — GHL tag failed"), so it isn't silent like this time.
4. Because the same helper is the canonical path, `Do Not Call` keeps its existing DND behavior — unchanged.

## Recovery for this patient (and any past ones)

Reuse the existing `backfill-review-exit-tags` pattern with a small one-off run that adds `appointment-oon` + `do-not-reschedule` and removes `reschedulable` for `all_appointments` rows with `status = 'OON'` that have a `ghl_id` (scoped to the last 90 days, batched). This is what un-sticks contacts already sitting in the wrong GHL workflow.

Tell me the patient's name/clinic and I'll confirm that row is included in the backfill.

## Technical details

- Files: `src/utils/appointmentStatusChange.ts` (tag push + warning), one new backfill edge function modeled on `supabase/functions/backfill-review-exit-tags/index.ts`.
- No schema changes, no GHL appointment-status behavior change (OON still releases the slot as `cancelled`).
- Memory note to add: OON side-effects now include the `appointment-oon` + `do-not-reschedule` contact tags on **every** OON write path, not just the Review Queue.
