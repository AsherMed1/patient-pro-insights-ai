# Cancellation Reason → GHL Tags → Reschedule SMS → Alerts

Three phases, built in the order you laid out. Each phase is independently shippable.

## Phase 1 — Push the cancellation reason to GHL as tags

Today the reason is saved in the portal and written into GHL only as free-text contact note text (`update-ghl-appointment` posts "Portal Cancellation: ..."). Notes can't drive workflow conditions, so we add tags.

What gets added to the GHL contact on every portal cancellation:

- `cancelled-portal` — always, so a workflow has a single reliable entry trigger.
- `cancel-reason-<slug>` — one normalized tag per reason, for example:
  - `cancel-reason-scheduling-conflict`
  - `cancel-reason-unable-to-reach`
  - `cancel-reason-missing-info`
  - `cancel-reason-not-interested`
  - `cancel-reason-seeking-treatment-elsewhere`
  - `cancel-reason-too-far`
  - `cancel-reason-do-not-contact`
  - `cancel-reason-unhappy`
  - `cancel-reason-disqualified`
  - `cancel-reason-other` / `cancel-reason-other-do-not-reschedule`
- `reschedulable` OR `do-not-reschedule` — the decisive flag for the SMS. Derived from the existing reason grouping (the "Do Not Reschedule" group already exists and already drives DND). `do-not-reschedule` is already used elsewhere, so this stays consistent.
- Stale cancel-reason tags from a previous cancellation are removed first so the contact never carries two contradicting reasons.

Also: the reason text keeps going into the GHL contact note as it does now (human readable), and a portal audit note records exactly which tags were pushed and whether GHL accepted them.

## Phase 2 — Reschedule SMS with the right link

- Add a **Reschedule/Booking URL** field per project, editable in the project settings dialog next to the other GHL settings.
- On cancellation, the portal writes that URL into a GHL contact custom field (`portal_reschedule_link`) so the SMS body can merge it, and skips it entirely when the contact is `do-not-reschedule`.
- The SMS itself is sent by your GHL workflow:
  - Trigger: tag `cancelled-portal` added
  - Condition: contact has `reschedulable` AND does not have `do-not-reschedule` / DND
  - Action: SMS containing the `portal_reschedule_link` merge field
- We document the exact workflow recipe (trigger, conditions, merge field name) so it can be cloned into each sub-account.
- Guardrail: if a project has no booking URL saved, the portal skips the link field and logs a warning, so no SMS goes out with a blank link.

## Phase 3 — Appointment event alerts

Since you're unsure of the scope, here's the proposed starting set. Everything is opt-in per project and off by default, and all alerts go to Slack (matching your existing Slack alert functions) with the option to add email later.

Recommended events:

1. **Cancellation** — patient cancelled/was cancelled in the portal, with reason and whether they're reschedulable.
2. **No-show** — includes the reschedule-eligibility decision once set.
3. **Reschedule** — old date/time/location → new, so the clinic sees moves without checking GHL.
4. **Short notice booking** — already exists; folded into the same alert surface for consistency.
5. **Recapture win** — a previously lost patient rebooked (data already tracked in the recapture tables).

Each alert carries: patient name, project, calendar/location, old and new appointment times where relevant, reason, and a direct link to the portal record.

Delivery: a shared alert dispatcher so all five events use one code path and one per-project on/off config, rather than five one-off functions.

## Technical notes

- **DB**: add `reschedule_booking_url` (text, nullable) to `projects`; add a small `project_alert_settings` structure (or JSONB column on `projects`) in Phase 3 for per-event toggles. No changes to `all_appointments` — `cancellation_reason` already stores what we need.
- **Tag mapping** lives in `src/components/appointments/cancellationReasons.ts` alongside the existing reason lists, so the dialog and tag push can never drift apart.
- **Tag push** reuses `update-ghl-contact-tags` (it already has the approved-tag guard and audit-note logging); a small remove-then-add sequence handles stale reason tags.
- **Custom field write** needs a new small edge function (`update-ghl-contact-fields`) — no existing function writes contact custom fields; only reads exist today.
- Cancellation entry points to update: `AppointmentCard.tsx` and `DetailedAppointmentView.tsx` (both already collect reason + Welcome Call answer), routed through one shared helper so the two surfaces behave identically.
- Failures to push tags/fields never block the cancellation itself; they are logged to `appointment_notes` with the GHL error text.

## Suggested order of delivery

1. Phase 1 tags + audit logging (unblocks you building the workflow in GHL immediately).
2. Project booking URL field + custom field push, then you wire the SMS workflow.
3. Alerts, once the first two are proven in production.
