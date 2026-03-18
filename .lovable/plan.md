

## Fix Ally Vascular Location & Service Filter Extraction

### Problem
The location/service regex in `AppointmentFilters.tsx` produces incorrect results for Ally's calendar name formats:

| Calendar Name | Current Location | Current Service |
|---|---|---|
| `...GAE Consultation (San Antonio, TX – Knee Pain Treatment)` | `(San Antonio, TX – Knee Pain Treatment)` | `GAE` |
| `...In-person Consultation at  San Antonio, TX ` | `San Antonio` | `GAE` (merged) |
| `...In-person Consultation (San Antonio, TX – ...)` | `(San Antonio, TX – Knee Pain Treatment)` | `GAE` (merged) |
| `...Neuropathy Consultation at  San Antonio, TX ` | `San Antonio` | `Neuropathy` |
| `...Virtual Consultation for Knee Pain Treatment` | `for Knee Pain Treatment` | `Virtual` |

**Expected:** Locations = `San Antonio`, `Virtual` · Services = `GAE`, `Neuropathy`

### Root Causes
1. **Location regex** doesn't handle parenthesized format `(City, ST – Description)` — it falls through to `Consultation (.+)$` and grabs the whole parenthetical
2. **"Virtual" calendar** has no city — `for Knee Pain Treatment` is extracted as a location. "Virtual" should be treated as a location, not a service.
3. **No normalization** for the `(City, ST – Description)` pattern to strip the description suffix

### Fix — `AppointmentFilters.tsx`, `fetchLocationAndServiceOptions` (~lines 124-155)

Update the extraction logic:

1. **Add parenthesized location pattern**: Before existing regex checks, try `\(([^)]+)\)` to extract content inside parens, then take only the city portion before ` – ` or ` - `.

2. **Handle "Virtual" as a location**: If the calendar name contains "Virtual Consultation", add "Virtual" as a location and skip the location regex entirely for that entry.

3. **Strip duplicate/malformed entries**: After the `–` split, normalize by removing trailing state abbreviations as already done, producing clean "San Antonio".

Updated extraction pseudocode:
```
for each calendar_name:
  // Service extraction (keep existing, works correctly)
  extract service from "your X Consultation" pattern
  merge "In-person" → "GAE"

  // Location extraction (new logic)
  if name contains "Virtual Consultation":
    locations.add("Virtual")
  else if name contains parenthesized "(City, ST – ...)" pattern:
    extract city from inside parens, split on " – " or " - ", take first part
    normalize (strip state suffix)
    locations.add(normalized)
  else:
    // existing " - ", " at ", "Consultation " fallback
    use current regex chain
```

### Files to Edit
- `src/components/appointments/AppointmentFilters.tsx` — location extraction logic (~lines 124-142)

### Also Check
The same extraction logic exists in `LocationLegend.tsx` (`extractLocationFromCalendarName`). That function is used for calendar view filters. It should get the same parenthesized-format and Virtual handling to stay consistent.

- `src/components/appointments/LocationLegend.tsx` — `extractLocationFromCalendarName` function (~lines 17-38)

