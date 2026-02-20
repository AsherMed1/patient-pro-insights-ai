
# Add PAD to the Texas Vascular Institute Service Filter

## Root Cause

The "All Services" dropdown in `AppointmentFilters.tsx` is populated **dynamically** — it queries the `all_appointments` table, parses each `calendar_name` with a regex, and builds a set of services from actual appointment data. Since Texas Vascular Institute currently has **zero PAD appointments** in the database, "PAD" never gets added to the set, and it never appears in the dropdown.

Their current calendar names are:
- `Request Your GAE Consultation - Dallas/Hurst/Plano`
- `Request Your PFE Consultation - Dallas/Hurst/Plano`
- `Request Your UFE Consultation - Dallas/Hurst/Plano`

There is no `PAD` calendar name for Texas Vascular Institute yet, so the dynamic approach can't discover it.

## Solution

Add a **project-level static service fallback** — a known map of services that certain projects offer, which gets merged with dynamically discovered services. This ensures PAD appears in the filter for Texas Vascular Institute immediately, even before any PAD appointments are booked.

This approach is safe and additive: dynamically discovered services still appear (no regression), and the static list simply guarantees known services are always present.

## Changes

### `src/components/appointments/AppointmentFilters.tsx`

1. Define a `KNOWN_PROJECT_SERVICES` map at the top of the file:
   ```typescript
   const KNOWN_PROJECT_SERVICES: Record<string, string[]> = {
     'Texas Vascular Institute': ['GAE', 'PAD', 'PFE', 'UFE'],
   };
   ```

2. In `fetchLocationAndServiceOptions()`, after building the `services` Set from the dynamic query, merge in any known services for the current project:
   ```typescript
   // Merge known project services (ensures services appear even with no appointments yet)
   if (projectFilter && projectFilter !== 'ALL') {
     const knownServices = KNOWN_PROJECT_SERVICES[projectFilter] || [];
     knownServices.forEach(s => services.add(s));
   }
   ```

3. The `serviceOptions` state will then include `PAD` for Texas Vascular Institute and the dropdown will show it.

### No changes needed to `AllAppointmentsManager.tsx`

The query-side filter already handles PAD correctly via `.ilike('calendar_name', '%PAD%')` — the generic `else` branch covers it.

## Result

The "All Services" dropdown for Texas Vascular Institute will show: **GAE, PAD, PFE, UFE** — matching all the services they actually offer, regardless of whether PAD appointments exist in the system yet.
