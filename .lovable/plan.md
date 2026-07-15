## Goal
Prevent users from selecting the "Welcome Call" status when an appointment's current status is "Cancelled". They must first move it to "Confirmed" (or any non-cancelled status), after which "Welcome Call" becomes selectable again.

## Scope
Frontend-only, presentation change in the two status dropdowns:
- `src/components/appointments/AppointmentCard.tsx` (~line 1872) — status Select in the card view
- `src/components/appointments/DetailedAppointmentView.tsx` (~line 947) — status Select in the detail modal

No backend, webhook, or DB changes. Existing automations, reporting, and GHL sync for Confirmed/Welcome Call remain untouched.

## Behavior
- Compute `isCancelled = (appointment.status || '').toLowerCase() === 'cancelled'`.
- When rendering the `SelectItem` for "Welcome Call":
  - If `isCancelled` is true → render it `disabled` with muted styling and a tooltip/title: "Change status to Confirmed first before moving to Welcome Call."
  - Otherwise render normally.
- All other status options remain unaffected regardless of current status.
- The currently-displayed value is not changed by this rule — only the option's selectability in the open dropdown.

## Edge cases
- Status comparison is case-insensitive and trimmed, matching the existing normalization pattern already used in `DetailedAppointmentView` (line 183).
- Only exact "Cancelled" (the terminal cancelled status) is blocked — other terminal statuses like No Show, OON, DNC are out of scope for this request.
- If an appointment somehow already has `status = 'Welcome Call'` while data shows a cancelled state elsewhere, the dropdown still displays the current value correctly; only the option in the list is disabled.

## Out of scope
- No changes to `statusOptions` list, filters, legend, or webhook validation.
- No server-side guard (this is a UI progression rule; the underlying data model still permits the transition for admin/edge cases).