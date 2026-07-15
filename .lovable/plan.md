## Goal
Prevent users from selecting the "Welcome Call" status directly from a cancelled appointment. They must first move it to "Confirmed".

## Scope
Frontend-only. Two status dropdowns render `statusOptions`:

1. `src/components/appointments/AppointmentCard.tsx` (~line 1872) — status dropdown on each appointment card.
2. `src/components/appointments/DetailedAppointmentView.tsx` (~line 947) — status dropdown in the detail modal.

## Changes

In both dropdowns, when rendering the `Welcome Call` `SelectItem`:

- Compute `isCancelled = currentStatus?.toLowerCase() === 'cancelled'`.
- If `isCancelled` and the option is `Welcome Call`, render the `SelectItem` with `disabled` and a muted look (`opacity-50 cursor-not-allowed`), plus a `title` tooltip: "Confirm the appointment before moving to Welcome Call."
- All other options remain enabled. If the current status is already `Welcome Call` (edge case where it was set before this rule), it still displays normally as the selected value (Radix Select shows the trigger label regardless of item disabled state).

No changes to:
- `statusOptions` array
- Backend, webhooks, GHL sync, notes, or automations
- Filters/legend (`AppointmentFilters.tsx`, `StatusFilterLegend.tsx`) — filtering by Welcome Call remains available everywhere

## Verification
- Cancelled appointment → open status dropdown in both card and detail view → "Welcome Call" is greyed out and not selectable.
- Change to Confirmed → "Welcome Call" becomes selectable.
- Non-cancelled statuses → dropdown behaves as before.
