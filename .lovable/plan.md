# Patient History (including superseded appointments)

Victor Young confirmed: 2 rows for the same GHL contact in Georgia Endovascular — the active Aug 28, 2026 booking and a superseded Jun 16, 2026 row (Cancelled). Today the superseded row is invisible anywhere in the appointment card, so it looks like the patient's earlier visit vanished.

## What to build

Add a collapsible **Patient History** section at the bottom of each appointment card (and keep/upgrade the existing one in the detailed view) that lists every appointment row for that patient in the project — including superseded ones.

Each row shows:
- Appointment date + time (or "No date" for unscheduled)
- Created date
- Service / calendar name
- Status badge
- A muted "Superseded" chip on retired rows
- "Current" marker on the row you're viewing

Behavior:
- Section only renders when there is more than one row, so single-appointment patients see no extra clutter.
- Collapsed by default on the card (expanded in the detailed view, as it is now).
- Superseded rows are visually de-emphasized (muted text, no action affordances) so no one mistakes them for live bookings.
- Sorted newest first; shows 10 with a "View more" toggle.

## Technical notes

- `src/hooks/useAppointmentHistory.tsx`: stop dropping superseded rows — add `is_superseded` and `date_appointment_created` to the select, keep the existing 3-tier match (ghl_id → phone+project → name+project), order by created date descending.
- `src/components/appointments/AppointmentHistory.tsx`: render the new columns, superseded chip, and muted styling; accept a `defaultOpen` prop so the card can start collapsed while `DetailedAppointmentView` stays open.
- `src/components/appointments/AppointmentCard.tsx`: render `<AppointmentHistory appointment={appointment} defaultOpen={false} />` at the bottom of the card body.
- No database or edge function changes; read-only presentation only.
