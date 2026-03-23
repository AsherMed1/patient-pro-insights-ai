

## Remove Duplicate "Office" Locations from Filter

### Problem
Location extraction produces duplicates like "Bel Air" and "Bel Air Office", "Elkton" and "Elkton Office", etc. The " Office" suffix is unnecessary and creates clutter.

### Fix

**File: `src/components/appointments/AppointmentFilters.tsx` (~line 148)**

After extracting the location string, strip trailing " Office" before adding to the set:

```typescript
if (locationExtracted 
  && !locationExtracted.toLowerCase().includes('somerset') 
  && !locationExtracted.toLowerCase().includes('milledgeville')
  && !/^for\s+/i.test(locationExtracted)
  && !/^\(/.test(locationExtracted)) {
  // Normalize: strip trailing " Office" to prevent duplicates
  locationExtracted = locationExtracted.replace(/\s+Office$/i, '').trim();
  locations.add(locationExtracted);
}
```

This collapses "Bel Air Office" → "Bel Air", "Elkton Office" → "Elkton", etc., while keeping the filter functional since the actual query uses `.ilike('calendar_name', '%Bel Air%')` which matches both variants.

**Also update `src/components/appointments/LocationLegend.tsx`** — the `extractLocationFromCalendarName` function should apply the same normalization for consistency.

### Files to Edit
- `src/components/appointments/AppointmentFilters.tsx` — add `.replace(/\s+Office$/i, '')` before `locations.add()`
- `src/components/appointments/LocationLegend.tsx` — same normalization in `extractLocationFromCalendarName`

