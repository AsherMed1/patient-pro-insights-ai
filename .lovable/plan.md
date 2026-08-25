# GHL tags for Recapture outcomes

## Answer first

No. Selecting **Not Interested** in the Recapture drawer does not touch GHL at all. Today it only:

- inserts the attempt row in `recapture_attempts`
- completes the case (`work_status='completed'`, `completion_reason='not_interested'`)
- inserts a `patient_reschedule_blocks` row (`blockFutureOutreach`)
- writes an internal note

The No-Show / cancellation paths do push tags via `pushLifecycleTags`, but Recapture never calls it. So GHL workflows cannot currently branch on a recapture opt-out.

## Proposed change

Push a tag set from Recapture whenever an outcome is terminal, reusing the existing `pushLifecycleTags` helper (which already writes an audit note and never blocks the save on a GHL failure):

| Recapture outcome | Tags pushed |
| --- | --- |
| Not Interested | `recapture-not-interested`, `do-not-reschedule` |
| Wrong Number | `recapture-wrong-number`, `do-not-reschedule` |
| Rescheduled / Booked | `recapture-rebooked`, `reschedulable` |

Contradicting flags are removed first (already handled inside `pushLifecycleTags`), so a contact never carries both `reschedulable` and `do-not-reschedule`.

Non-terminal outcomes (Text Sent, Patient Responded, Follow-Up Required, Callback Requested, Nurture) push nothing — they stay portal-internal.

## Technical notes

- `src/components/appointments/cancellationTags.ts`: add `'recapture'` to `LifecycleEventKind` with reason prefix `recapture-reason`, or simpler — call `pushLifecycleTags` with `kind: 'cancellation'` and `extraTags: ['recapture-not-interested']`. Preferred: add a small dedicated `pushRecaptureTags({ appointmentId, outcome })` wrapper so cancellation semantics aren't overloaded.
- `src/components/recapture/RecaptureCaseDrawer.tsx`: in `persist()`, after the `recapture_cases` update succeeds and alongside `blockFutureOutreach`, fire the tag push for the three terminal outcomes. Uses `row.appointment_id`; skip silently when it is null.
- No schema change. No edge function change — `update-ghl-contact-tags` already resolves the project GHL API key.

## Open question

If you'd rather reuse the existing tag vocabulary the clinics' GHL workflows already listen to (`cancel-reason-not-interested` / `do-not-reschedule`) instead of new `recapture-*` tags, say so and I'll swap the mapping.
