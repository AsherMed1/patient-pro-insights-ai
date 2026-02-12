

# Appointment History Section in Detail View

## Overview

Add an "Appointment History" section to the appointment detail modal (between Internal Notes and Patient Intake Notes) that shows all past and future appointments for the same patient. This gives portal users a GHL-like view of the patient's full appointment timeline without leaving the current view.

## How It Works

When a patient's appointment detail modal opens, query the `all_appointments` table for all appointments matching the same patient (by `ghl_id`, phone, or name+project). Display them in reverse chronological order, showing date/time, service type, location, and status.

## What the User Sees

A new collapsible "Appointment History" section appears in the detail modal. Each entry is a compact row:

```text
2026-02-12 14:30 | GAE Consult | Lone Tree | Confirmed
2026-02-10 09:00 | GAE Consult | Lone Tree | Cancelled
2026-02-08 11:15 | GAE Consult | Lone Tree | Rescheduled -> 2026-02-12 14:30
```

- Shows the most recent 10 entries by default
- "View more" button expands to show up to 20
- The current appointment is highlighted with a subtle indicator
- Times are displayed in a readable format

## Technical Details

### New Hook: `src/hooks/useAppointmentHistory.tsx`

- Accepts the current appointment's identifiers (ghl_id, phone, name, project)
- Queries `all_appointments` for all matching records, ordered by `date_of_appointment DESC`
- Limits to 20 records max
- Matches by `ghl_id` first, then falls back to phone number within the same project, then name + project

### New Component: `src/components/appointments/AppointmentHistory.tsx`

- Receives the current appointment and renders the history list
- Each row shows: date/time, calendar_name (service type), project_name (location proxy), and status
- Color-coded status badges (green for Showed, red for Cancelled/No Show, blue for Confirmed, gray for others)
- Initially shows 10 entries; "View more" button reveals the rest
- Wrapped in a collapsible section with a History icon
- Skips reserved blocks (`is_reserved_block = true`)

### Modified: `src/components/appointments/DetailedAppointmentView.tsx`

- Import and render `AppointmentHistory` between the Internal Notes section (line 694) and Patient Intake Notes section (line 698)
- Pass the current appointment object so the history component can find related records

### Guardrails

- Read-only display -- no editing from the history section
- Only appends context, never modifies existing notes or data
- Capped at 20 entries to keep queries fast
- Current appointment is visually distinguished so users know which one they're viewing

