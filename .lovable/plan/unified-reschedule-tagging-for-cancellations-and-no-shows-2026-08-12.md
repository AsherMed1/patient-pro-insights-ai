# Unified Reschedule Tagging for Cancellations and No-Shows

Today only cancellations push the full tag set to GHL. No-shows push tags only when the patient is marked *not* eligible (`no-show-not-eligible` + `do-not-reschedule`), and an eligible no-show pushes nothing — so there is no trigger and no `reschedulable` flag for GHL workflows to branch on.

This unifies both paths on the same tag vocabulary.

## Tag surface after this change

Cancellation (unchanged):
- `cancelled-portal`
- `cancel-reason-<slug>`
- `reschedulable` OR `do-not-reschedule`

No Show (new):
- `no-show-portal` — always added; the single workflow trigger for no-shows
- `no-show-reason-<slug>` — only when a reason is selected (see below)
- `reschedulable` OR `do-not-reschedule` — same branch flag, same meaning
- `no-show-not-eligible` stays for backward compatibility when not eligible

Housekeeping mirrors the cancellation logic: the opposite branch flag and any stale reason tag are removed before the new set is added, so a contact never carries both `reschedulable` and `do-not-reschedule`.

## Reason capture when none is specified

The No Show dialog currently asks only "eligible / not eligible" plus free-text notes. It will be upgraded to match the cancellation dialog's shape:

- Required choice: **Reschedule this patient** or **Do not reschedule**
- Optional reason dropdown per branch, reusing the same reason vocabulary as cancellations:
  - Reschedulable: Unable to Reach, Scheduling Conflict, Missing Required Information, Other
  - Do Not Reschedule: Not Interested Anymore, Seeking Treatment Elsewhere, Lives Too Far, Does Not Want to Be Contacted, Unhappy with Service, Disqualified, Other (Do Not Reschedule)
- "Other" requires notes, same rule as cancellations
- If no reason is picked, no `*-reason-*` tag is sent — the branch flag alone drives the general message with the reschedule link

The same "no reason specified" fallback applies on the cancellation side: the branch flag is always sent, so a generic cancellation SMS with a reschedule link can always fire.

## What you build in GHL

- Trigger: tag `cancelled-portal` added, or tag `no-show-portal` added
- Condition: has `reschedulable`, does not have `do-not-reschedule`, not DND
- Action: reschedule-link SMS (generic copy when no reason tag is present, per-reason branches when one is)

## Technical notes

- Extract the shared tag-push logic out of `src/components/appointments/cancellationTags.ts` into a generic helper that takes an event kind (`cancellation` | `no-show`) and an optional reason, keeping one place where tag names are defined.
- Reason -> slug mapping is shared with cancellations, prefixed per event kind; unknown reasons fall back to the existing slugify.
- `src/utils/rescheduleBlock.ts#applyNoShowEligibility` gains reason support and calls the shared push instead of its current inline two-tag sync; the portal-side block, `patient_reschedule_blocks` row, and internal note behaviour are unchanged.
- `liftRescheduleBlock` removes `no-show-not-eligible` + `do-not-reschedule` and adds `reschedulable`.
- `NoShowEligibilityDialog.tsx` gets the reason selects; both call sites (`AppointmentCard.tsx`, `DetailedAppointmentView.tsx`) pass the reason through.
- Every push writes an audit note to `appointment_notes` listing the exact tags sent and whether GHL accepted them. Tag failures never block the status change.
- No schema changes required; the no-show reason is stored in the internal note text alongside the existing eligibility fields.

## Open item

If you want the no-show reason to be reportable (filterable in the portal, not just readable in notes), that needs a `no_show_reason` column on `all_appointments`. Say the word and I'll add it to the plan.
