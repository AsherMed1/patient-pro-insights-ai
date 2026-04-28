## Recapture Tracking System

Track patients who No Show / Cancel and later get back on the schedule, so reactivation campaign performance is measurable.

### Definitions

- **Lost Appointment**: an appointment whose status is `Cancelled`, `No Show`, or `Do Not Call`.
- **Recapture**: a NEW appointment for the same patient (matched by `ghl_id`, else phone, else email, else name+project) created AFTER a Lost Appointment, within the same project.
- **Recapture Window**: configurable, default 90 days from the lost appointment's date.
- **Recapture Outcome**: tracked through the lifecycle of the new appointment (Confirmed → Showed/Won, or Lost again).

### What we'll build

**1. Database — new view + helper columns**

- Add two nullable columns to `all_appointments`:
  - `recaptured_from_appointment_id uuid` — pointer to the original lost appointment this one recaptured.
  - `recapture_detected_at timestamptz` — when the link was made.
- Create a SQL view `recapture_events` that joins each Lost Appointment to its earliest qualifying recapture (if any), with: original appt, recapture appt, days between, recapture status, project, and final outcome (Showed / Won / Lost again / Pending).

**2. Trigger — auto-link recaptures**

When a new (non-terminal) appointment is inserted or its status flips to active, scan for the most recent Lost Appointment within 90 days for the same patient (same matching priority as `get_appointment_lead_association`) in the same project. If found, populate `recaptured_from_appointment_id` and `recapture_detected_at` on the new row.

**3. Backfill migration**

One-time pass over historical data to populate `recaptured_from_appointment_id` for existing pairs so the dashboard shows real numbers from day one.

**4. Dashboard UI — new "Recaptures" tab**

Location: new tab inside the existing Reports / Dashboard area (alongside performance metrics).

KPIs at top:
- Total Lost Appointments (period)
- Total Recaptured (period)
- Recapture Rate (%)
- Of recaptures: # Showed, # Won (procedure ordered), # Lost again
- Avg days from loss → recapture

Filters: project, date range (applies to original lost-appointment date), lost reason (Cancelled / No Show / DNC).

Table below KPIs: each recapture event — patient, project, original date, original status, recapture date, current status, days between, outcome. Clickable to open the patient card.

**5. Per-patient indicator**

On the AppointmentCard, show a small "Recaptured" badge when `recaptured_from_appointment_id` is set, with a tooltip showing the original lost appointment date + reason. On the original lost appointment, show a "Recaptured ✓" badge linking forward to the new appointment.

### Technical details

- Matching priority mirrors `get_appointment_lead_association`: ghl_id → phone+project → email+project → name+project.
- The trigger excludes `is_reserved_block = true` and `is_superseded = true` rows on both sides.
- "Rescheduled" status is NOT treated as a loss (it's a same-encounter move, not a lost lead). Only `Cancelled` / `No Show` / `Do Not Call` count as losses.
- `recapture_events` view drives both the dashboard and any future export.
- New RLS: same project-scoped access as `all_appointments` (inherits via the view).
- Add to existing audit log when a recapture is detected (`entity='appointment'`, `action='recapture_linked'`).

### Files / areas touched

- Migration: add columns, trigger function `link_recapture_on_active()`, attach to `all_appointments`, create `recapture_events` view, backfill query.
- New component: `src/components/dashboard/RecaptureDashboard.tsx` (KPIs + table + filters).
- New hook: `src/hooks/useRecaptureMetrics.tsx`.
- Edit: `src/components/appointments/AppointmentCard.tsx` to show the Recaptured badge.
- Edit: dashboard router/tabs to expose the new tab.
- Memory: add `mem://features/recapture-tracking` documenting the loss → recapture rules.

### Open questions before I build

1. **Recapture window** — default 90 days from the lost appointment date. Want a different window (e.g. 60 or 180)?
2. **Lost statuses to count** — Cancelled, No Show, Do Not Call. Include `OON` as a loss too, or exclude (since it's an insurance issue, not a no-show)?
3. **Dashboard placement** — new tab inside the existing Dashboard, or a standalone page in the sidebar?

Approve and I'll implement, or answer the 3 questions first and I'll tailor it.
