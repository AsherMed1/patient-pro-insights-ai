# Services dropdown: show all project services, disable inactive ones in date range

## What changes

Update the **Services** dropdown in `AppointmentFilters.tsx` so that, when a date range is active, every service line for the clinic is still visible but services with no appointments in the selected range are **disabled and greyed out** instead of being hidden.

- **No date range set:** behavior stays the same as today (all services for the clinic are enabled).
- **Date range set:**
  - Services with ≥1 appointment in the range remain selectable.
  - Services with 0 appointments in the range are visible but disabled/greyed out and cannot be selected.
  - The currently selected service always stays enabled, even if it has no appointments in the range, so the active filter and its chip never break silently.
- The hard-coded fallback service lists (`KNOWN_PROJECT_SERVICES`) continue to supply the full clinic service list when no date range is active; with a date range they provide the "all services" baseline against which active services are compared.
- Locations dropdown is not changed.

## Technical notes

In `src/components/appointments/AppointmentFilters.tsx`:

1. Keep the existing date-range-aware query that resolves active services from `parsed_pathology_info->>procedure_type` (falling back to calendar-name matching), scoped to `date_of_appointment` or `created_at` based on `dateFilterType`.
2. Add a second state/set for the **full** service list:
   - When `projectFilter` is a specific project, start from `KNOWN_PROJECT_SERVICES[projectFilter]` plus any services observed in the unscoped project data.
   - When `projectFilter` is `ALL`, use all observed services across the current appointment set (or keep current behavior).
3. In the Services `SelectContent`, render the full list. Use a conditional style/class to grey out items that are not in the active set. Use `SelectItem` `disabled` prop or a wrapper that prevents selection for inactive items.
4. Ensure the selected `serviceFilter` is always present in the full list and is not disabled.
5. Keep `dateRange`, `dateFilterType`, and `projectFilter` in the effect dependencies so options refresh correctly.
