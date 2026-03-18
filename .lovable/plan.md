

## Fix Ally Vascular Location & Service Filter (Round 2)

### Problems (from screenshots)

**Locations dropdown shows:** `(San Antonio, TX – Knee Pain Treatment)`, `San Antonio`, `for Knee Pain Treatment`
**Should show:** `Virtual`, `San Antonio`

**Services dropdown shows:** `GAE`, `Neuropathy`, `Virtual`
**Should show:** `GAE`, `Neuropathy`

### Root Causes in `AppointmentFilters.tsx`

1. **Service extraction runs for all calendars including Virtual** — Line 153 regex `your\s+...Consultation` matches "your Virtual Consultation" and extracts "Virtual" as a service. Fix: skip service extraction when calendar is a Virtual Consultation, or filter out "Virtual" from services.

2. **"for Knee Pain Treatment" leaking as location** — Some calendar names like "Virtual Consultation for Knee Pain Treatment" (without "your" prefix) bypass the virtual check on line 127 if the format varies, OR the `Consultation\s+(.+)$` fallback on line 142 catches the suffix. Need to verify: if line 127's virtual check passes, the location extraction is skipped via the if/else — but the fallback regex `Consultation\s+(.+)$` might match a slightly different calendar name format that doesn't trigger the virtual check.

3. **Full parenthetical still appearing** — The parenthesized match regex may not be catching all variants. Could be a calendar name where the paren format differs slightly.

### Fix (in `AppointmentFilters.tsx`, lines ~124-162)

**Service extraction fix:**
```typescript
// After extracting service, filter out "Virtual" — it's a location, not a service
if (service.toLowerCase() === 'in-person') service = 'GAE';
if (service.toLowerCase() === 'virtual') return; // skip, not a service
```

**Location extraction fix — tighten fallback:**
```typescript
// In the else branch (non-paren, non-virtual), add guard against "for ..." suffixes
if (locationMatch && locationMatch[1]) {
  let loc = locationMatch[1].trim().replace(/,\s*[A-Z]{2}$/, '').trim();
  // Skip descriptive suffixes like "for Knee Pain Treatment"
  if (/^for\s+/i.test(loc)) continue; // not a real location
  locations.add(loc);
}
```

**Parenthetical dedup** — ensure the full `(City, ST – Description)` string is never added raw. The current code on line 136-137 should handle this, but add a guard to skip if extraction yields empty or looks like a full paren string.

### Also update `LocationLegend.tsx`

The `extractLocationFromCalendarName` function (lines 17-38) needs the same "for ..." guard to stay consistent.

### Files to Edit
- `src/components/appointments/AppointmentFilters.tsx` — lines ~124-162
- `src/components/appointments/LocationLegend.tsx` — lines ~17-38

### Build Error Note
The `rollup` missing package error is a **pre-existing environment issue** unrelated to these code changes. It requires a dependency reinstall (`npm install` or clearing `node_modules`). This plan focuses solely on the filter logic fix.

