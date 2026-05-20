# ECCO Service Filter Cleanup

## Problem
ECCO's GHL calendar names embed both modality and service:
- `Request Your Virtual GAE Consultation`
- `Request Your In-Person GAE Consultation at Lone Tree`
- `Request Your In-Person PAE Consultation at Lone Tree, CO`
- `Request Your Virtual PFE Consultation`
- etc.

`AppointmentFilters.tsx` extracts the text between `your` and `Consultation`, then only strips a *trailing* "Virtual" and converts `In-Person` → `GAE`. For ECCO this yields six service rows ("Virtual GAE", "In-Person GAE", "Virtual PFE", "Virtual PAE", "In-Person PAE", "In-Person PFE") and treats modality as a service.

## Fix
File: `src/components/appointments/AppointmentFilters.tsx`

1. Replace the service post-processing (lines ~165-178) with a modality-stripping pass:
   - Remove leading/trailing `Virtual` and `In-Person` (and `In Person`) tokens from the extracted service string.
   - Drop the special-case `in-person` → `GAE` remap (it was a hack that won't generalize to PAE/PFE/UFE).
   - Skip empty/`virtual`/`in-person`-only results.
2. Add ECCO to `KNOWN_PROJECT_SERVICES` so its dropdown is stable even before all calendars are seen:
   ```ts
   'ECCO Medical': ['GAE', 'PAE', 'PFE'],
   ```

Location extraction already adds `Virtual` when the calendar name contains "virtual" and parses `Lone Tree` / `Pueblo` from the `at ...` / `, CO` suffix, so locations need no change.

## Service-matching for results
`appointments` filter logic matches service via `getEventTypeFromCalendar` (keyword match on `GAE`/`PAE`/`PFE`), which already returns the correct service regardless of `Virtual`/`In-Person` prefix. So once the dropdown is cleaned up, filtering by `GAE` will return all GAE rows across Lone Tree, Pueblo, and Virtual without further changes.

## Out of scope
- No DB / migration changes.
- No edits to `LocationLegend.tsx` (Virtual-as-location already works for ECCO).
- No changes to Ventra/VSNC (their calendar names don't carry the modality prefix).
