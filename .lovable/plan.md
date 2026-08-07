# Show only service lines active in the selected date range

## Problem

The Services dropdown lists every service line a clinic has ever had (plus hard-coded fallbacks), so July shows 6 options even though only 3 have appointments in that range.

## What changes

The Services dropdown becomes date-range aware: it lists only service lines with at least one appointment inside the currently selected date range, honoring the Appt Date / Created Date toggle.

- When no date range is set, behavior stays as today (all services for the clinic).
- If the currently selected service is no longer in the range, it stays visible (marked as selected) so the active filter and its chip never break silently.
- The hard-coded fallback service lists (Texas Vascular, Champion Heart, ECCO Medical) apply only when no date range is active, so they can't reintroduce inactive services in a filtered month.
- Locations dropdown keeps its current behavior (not part of this request).

## Technical notes

In `src/components/appointments/AppointmentFilters.tsx`:

- `fetchLocationAndServiceOptions` currently queries `all_appointments.calendar_name` filtered by project only. Add date filtering on `date_of_appointment` or `created_at` based on `dateFilterType`, using `dateRange.from` / `dateRange.to`.
- Also select `parsed_pathology_info` so the derived service set matches the filtering logic used in `AllAppointmentsManager` (which prefers `parsed_pathology_info->>procedure_type`, falling back to calendar-name matching), rather than the calendar-name regex alone.
- Build the service set from that resolved procedure value; keep existing modality stripping (Virtual / In-Person).
- Add `dateRange` and `dateFilterType` to the effect's dependency array so options refresh when the range or the Appt/Created toggle changes.
