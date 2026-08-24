# Patients aren't deleted — older records get hidden

## What I verified for Victor Young (Georgia Endovascular)

Both of his records are still in the database:

| Created | Appointment date | Status | Visible in portal? |
|---|---|---|---|
| May 6, 2026 | Jun 16, 2026 | Cancelled | No — flagged as superseded |
| Aug 22, 2026 | Aug 28, 2026 | Confirmed | Yes |

Nothing was deleted. When his new August booking came in from GHL for the same contact, the portal's duplicate-prevention logic marked the older cancelled May row as `is_superseded = true`. Every client-facing view (Appointments tabs, dashboards, calendar, search) filters superseded rows out, so the May history became invisible — which is why it looks like he was deleted and now reads as a brand-new lead.

This is systemic, not a one-off: 130 superseded rows on Georgia Endovascular alone (Texas Vascular 124, Painless Center 112, NG Vascular 105, and so on across every clinic).

Two secondary reasons older patients are hard to find:
- Search only looks inside the currently selected tab, so a Cancelled patient won't appear while on New or Upcoming.
- Search is also constrained by whatever date range is applied.

## What to build

### 1. Global patient search (clinic-facing)
A search that ignores tab, date range and the superseded filter:
- Searches name, phone, email, DOB across the clinic's entire history.
- Results show every matching record for that patient, newest first, each labelled with status, appointment date, and an "Archived (merged into newer booking)" badge for superseded rows.
- Clicking a result opens that record read-only if archived, or normally if active.

### 2. Patient history on the active record
On an appointment's detail view, show a "Previous bookings for this patient" section listing the superseded/older rows (date, status, cancellation reason), so staff can see the full journey without hunting. This makes Victor Young's May consult visible from his August record.

### 3. Don't hide cancelled history from search
Keep superseded rows out of counts, dashboards and reporting (so metrics stay correct), but make them reachable via search and patient history.

## Technical notes

- Root cause path: `supersedeOlderContactRows` in `supabase/functions/ghl-webhook-handler/index.ts` sets `is_superseded = true`; every read path (`AllAppointmentsManager.tsx`, `ProjectPortal.tsx`, `useCalendarAppointments.tsx`, `lib/reporting.ts`, dashboards) filters with `.or('is_superseded.is.null,is_superseded.eq.false')`.
- New global search component queries `all_appointments` without the tab/date/superseded filters, scoped to the user's accessible projects (RLS already handles project scoping), matching on `lead_name`, `lead_phone_digits`, `lead_email`, `dob`, reusing `applySearchFilter` from `src/utils/appointmentSearchFilters.ts`.
- Patient history section matches siblings by `ghl_id` (fallback: `lead_phone_digits` + `project_name`) and reuses the existing appointment history hook pattern in `src/hooks/useAppointmentHistory.tsx`.
- No schema change and no data migration required; superseded rows are intact.
- Counts, dashboards and Excel exports keep their current superseded exclusion so reporting numbers don't shift.
