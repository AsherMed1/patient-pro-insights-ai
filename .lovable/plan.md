
# Plan: Merge "GAE" and "In-person" Services for Ally Vascular

## Problem

In the Ally Vascular project, the Services filter dropdown shows both "GAE" and "In-person" as separate options. These represent the same service type and should be merged into a single "GAE" option.

## Current Calendar Names in Database

```
Request Your GAE Consultation (San Antonio, TX – Knee Pain Treatment)
Request Your In-person Consultation at San Antonio, TX
Request Your In-person Consultation (San Antonio, TX – Knee Pain Treatment)
Request Your Neuropathy Consultation at San Antonio, TX
Request Your Virtual Consultation for Knee Pain Treatment
```

## Root Cause

The service extraction logic in `AppointmentFilters.tsx` uses regex to extract service type from calendar names:
```typescript
const serviceMatch = item.calendar_name.match(/your\s+["']?([^"']+)["']?\s+Consultation/i);
```

This extracts "In-person" and "GAE" as separate services.

## Solution

Modify the service extraction and filtering logic to:
1. Treat "In-person" as "GAE" when extracting services for the dropdown
2. When filtering by "GAE", match both "GAE" and "In-person" calendar names

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentFilters.tsx` | Normalize "In-person" to "GAE" during extraction |
| `src/components/AllAppointmentsManager.tsx` | Update service filter to match both GAE and In-person |
| `src/components/projects/ProjectDetailedDashboard.tsx` | Same filter logic update for Overview tab |

---

## Implementation Details

### Step 1: Normalize Service Extraction in AppointmentFilters.tsx

Modify the `fetchLocationAndServiceOptions` function to map "In-person" to "GAE":

```typescript
// Line ~137-140 in fetchLocationAndServiceOptions
const serviceMatch = item.calendar_name.match(/your\s+["']?([^"']+)["']?\s+Consultation/i);
if (serviceMatch && serviceMatch[1]) {
  let service = serviceMatch[1].trim();
  // Merge In-person with GAE - they are the same service type
  if (service.toLowerCase() === 'in-person') {
    service = 'GAE';
  }
  services.add(service);
}
```

### Step 2: Update Filter Logic in AllAppointmentsManager.tsx

When filtering by "GAE", also include "In-person" calendar names:

```typescript
// Lines ~262-265 (count query) and ~397-400 (data query)
if (serviceFilter !== 'ALL') {
  if (serviceFilter === 'GAE') {
    // GAE and In-person are the same service type
    countQuery = countQuery.or('calendar_name.ilike.%GAE%,calendar_name.ilike.%In-person%');
  } else {
    countQuery = countQuery.ilike('calendar_name', `%${serviceFilter}%`);
  }
}
```

### Step 3: Update ProjectDetailedDashboard.tsx

Apply the same logic for the Overview tab's service filter:

```typescript
// Lines ~189-192
if (serviceFilter && serviceFilter !== 'ALL') {
  if (serviceFilter === 'GAE') {
    appointmentsQuery = appointmentsQuery.or('calendar_name.ilike.%GAE%,calendar_name.ilike.%In-person%');
  } else {
    appointmentsQuery = appointmentsQuery.ilike('calendar_name', `%${serviceFilter}%`);
  }
}
```

---

## Result

After implementation:
- The Services dropdown will show: **GAE, Neuropathy, Virtual** (no "In-person")
- Selecting "GAE" will filter to include both GAE and In-person consultation appointments
- All metrics and counts will correctly combine both service types

---

## Technical Notes

- This is a UI-only change - no database modifications needed
- The calendar names in the database remain unchanged
- The normalization happens at the presentation layer only
- This pattern can be extended for other projects if similar merges are needed in the future
