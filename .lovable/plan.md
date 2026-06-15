# Fix Ally Vascular location dropdown

## Problem
For **Ally Vascular and Pain Centers**, the Locations dropdown currently shows four San Antonio-related entries:

- Amber Street, San Antonio
- **San Antonio** ← ambiguous / duplicate-looking
- Stonehue, San Antonio
- Virtual

The bare "San Antonio" entry comes from ~301 appointments tied to calendars named "...at San Antonio, TX" (with no street). Sitting alongside the two street-named offices it looks like a duplicate and confuses clients.

Per your decision, the dropdown should show only:
**Amber Street, San Antonio · Stonehue, San Antonio · Virtual**

Since we don't yet know which physical office those plain "San Antonio, TX" calendars belong to, we will **not** reassign or merge the underlying data. We'll only hide the standalone "San Antonio" option from the filter dropdown. Those appointments still surface under "All Locations" and on the calendar itself.

## Changes

Add a project-scoped exclusion (same pattern as the Fayette / Premier Vascular constraints) so that for `Ally Vascular and Pain Centers`, the extracted location string `"San Antonio"` (exact match, not Amber Street or Stonehue) is dropped from the dropdown.

Files to update (each has its own location-extraction loop):

1. **`src/components/appointments/AppointmentFilters.tsx`** — `fetchLocationAndServiceOptions` (around line 152). After the existing Somerset/Milledgeville guard, add:
   ```ts
   if (projectFilter === 'Ally Vascular  and Pain Centers'
       && locationExtracted.trim().toLowerCase() === 'san antonio') {
     // skip — ambiguous bucket, real offices are Amber Street / Stonehue
   } else { locations.add(locationExtracted); }
   ```
2. **`src/components/projects/ProjectDetailedDashboard.tsx`** — mirror the same exclusion in its location-options builder (around line 515 area).
3. **`src/components/appointments/LocationLegend.tsx`** — extend the existing `LEGACY_LOCATIONS` handling so that when `projectName === 'Ally Vascular  and Pain Centers'`, an exact `"San Antonio"` is skipped (keeping `"Amber Street, San Antonio"` and `"Stonehue, San Antonio"` intact via the existing `.includes()` check change to exact-match for this case).

Note: the project name in the DB has a double space ("Ally Vascular  and Pain Centers") — we'll match that exactly.

## Memory
Add a new memory entry under constraints:
- `mem://constraints/ally-vascular-locations` — Ally Vascular and Pain Centers dropdown hides standalone "San Antonio"; only Amber Street, Stonehue, and Virtual are exposed. Underlying ~300 appointments are not reassigned; they remain visible under "All Locations" pending clinic confirmation of which physical office they belong to.

## Out of scope
- No data migration. We are not reassigning the 301 "San Antonio, TX" appointments to Amber Street or Stonehue.
- No calendar-name rewrites in GHL.
- Once you confirm with Ally which office those calendars actually represent, a follow-up task can either rename the calendars in GHL or backfill `parsed_pathology_info.location` to merge them.
