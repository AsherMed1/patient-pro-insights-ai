

# Fix Duplicate Locations for ECCO Medical

## Problem
Calendar names for ECCO Medical are inconsistent — some end with just the city ("Lone Tree", "Pueblo") while others include the state ("Lone Tree, CO", "Pueblo, CO"). The location extraction regex treats these as separate locations, producing duplicates in the dropdown.

## Fix

### File: `src/components/appointments/AppointmentFilters.tsx` (~line 113)

After extracting the location string from `calendar_name`, normalize it by stripping a trailing state abbreviation (e.g., ", CO", ", KY"). This collapses "Lone Tree, CO" into "Lone Tree" and "Pueblo, CO" into "Pueblo".

Add one line after extracting the location:

```typescript
// After: const location = locationMatch[1].trim();
// Add normalization to strip trailing state abbreviation
const normalizedLocation = location.replace(/,\s*[A-Z]{2}$/, '').trim();
```

Then use `normalizedLocation` instead of `location` for the Somerset check and the `locations.add()` call.

### File: `src/components/projects/ProjectDetailedDashboard.tsx`

Apply the same normalization in the dashboard's location extraction logic so both views stay consistent.

### Result
The dropdown will show just "Lone Tree" and "Pueblo" — no duplicates.

