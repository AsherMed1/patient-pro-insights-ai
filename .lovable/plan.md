# Cancellation Reason → GHL Tags

Scope narrowed: the portal's only job is to push accurate tags to the GHL contact when an appointment is cancelled. The reschedule SMS, the booking link, and all event alerts are built inside GHL workflows off those tags.

## What the portal will push

Today the reason is saved in the portal and sent to GHL only as free-text contact note text ("Portal Cancellation: ..."), which can't drive workflow conditions. On every portal cancellation we'll add:

- `cancelled-portal` — always. Single reliable workflow trigger.
- `cancel-reason-<slug>` — one normalized tag per reason:
  - `cancel-reason-scheduling-conflict`
  - `cancel-reason-unable-to-reach`
  - `cancel-reason-missing-info`
  - `cancel-reason-not-interested`
  - `cancel-reason-seeking-treatment-elsewhere`
  - `cancel-reason-too-far`
  - `cancel-reason-do-not-contact`
  - `cancel-reason-unhappy`
  - `cancel-reason-disqualified`
  - `cancel-reason-other`
  - `cancel-reason-other-do-not-reschedule`
- `reschedulable` OR `do-not-reschedule` — the decisive flag your SMS workflow branches on. Derived from the existing reason grouping (the Do Not Reschedule group already exists and already triggers DND). `do-not-reschedule` is already in use, so nothing changes there.

Housekeeping: any `cancel-reason-*` tag from a previous cancellation is removed before the new one is added, so a contact never carries two contradicting reasons. The free-text contact note stays as-is for human readability.

## Your side in GHL

Ready to build once this ships:
- Trigger: tag `cancelled-portal` added
- Condition: has `reschedulable`, does not have `do-not-reschedule`, not DND
- Action: reschedule-link SMS, plus any per-reason branches using the `cancel-reason-*` tags
- Alerts for other appointment events can hang off the same tag surface later

## Technical notes

- Tag mapping lives next to the existing reason lists in `src/components/appointments/cancellationReasons.ts`, so the dialog and the tag push can never drift apart.
- Pushing uses the existing `update-ghl-contact-tags` function (already has audit-note logging and the approved-tag guard) — a remove call for stale reason tags, then an add call.
- Both cancellation entry points (`AppointmentCard.tsx` and `DetailedAppointmentView.tsx`) route through one shared helper so they behave identically.
- Every push writes an audit note to `appointment_notes` listing the exact tags sent and whether GHL accepted them.
- Tag failures never block the cancellation itself; the appointment still cancels and the GHL error text is logged.
- No database schema changes needed — `cancellation_reason` already stores everything required.
