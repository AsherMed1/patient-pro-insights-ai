## Issue

For Ventra, two filtering bugs cause virtual appointments to be double-counted (under both Virtual and the physical city) and to disappear from procedure filters:

1. **Location extraction treats "Virtual at Great Neck" as Great Neck.** `extractLocationFromCalendarName` (used by the calendar views, `LocationLegend`, and `UpcomingEventsPanel`) only short-circuits to `Virtual` when the calendar name is literally "Virtual Consultation". For Ventra's calendar `Request Your Virtual Consultation at Great Neck, NY`, the `at (.+)` branch fires and returns `Great Neck` — so the row gets counted as a physical Great Neck appointment on the calendar/location legend.

2. **Service filter relies only on calendar_name.** Ventra's bare virtual calendar `Request Your Virtual Consultation at Great Neck, NY` contains no `UFE` token. The backend filter in `AllAppointmentsManager` and `ProjectDetailedDashboard` is `calendar_name ilike '%UFE%'`, so virtual UFE patients are excluded from the UFE filter even though `parsed_pathology_info.procedure = 'UFE'`.

The list-page location filter (`AllAppointmentsManager`) already excludes Virtual rows correctly with `.not('calendar_name','ilike','%Virtual%')`, so #1 is purely a calendar/legend/upcoming-panel bug. The dashboard option builder is also fine.

## Plan

### 1. Treat any "virtual" calendar as Virtual location everywhere

`src/components/appointments/LocationLegend.tsx` — change `extractLocationFromCalendarName` so the very first check is:

```ts
if (calendarName && /\bvirtual\b/i.test(calendarName)) return 'Virtual';
```

This makes the function consistent with how `AppointmentFilters` and `ProjectDetailedDashboard` already build their location dropdowns. As a result:

- `LocationLegend` no longer shows Great Neck for virtual rows.
- `UpcomingEventsPanel` location filter routes virtual rows to `Virtual` only.
- All calendar views (Day/Week/Month/Detail) inherit the same behavior since they share this helper.

### 2. Service filter falls back to `parsed_pathology_info.procedure`

Change the procedure-based filters so a service token matches either the calendar name or the parsed pathology procedure.

Files / spots to update (all currently use `ilike('calendar_name','%SVC%')`):

- `src/components/AllAppointmentsManager.tsx` — count query (~line 297), list query (~line 450), calendar-view query (~line 605), and CSV export query (~line 1485).
- `src/components/projects/ProjectDetailedDashboard.tsx` — stats query (~line 234).

For a non-GAE service `SVC`, replace:

```ts
query = query.ilike('calendar_name', `%${SVC}%`);
```

with:

```ts
query = query.or(
  `calendar_name.ilike.%${SVC}%,parsed_pathology_info->>procedure.eq.${SVC}`
);
```

For the `GAE` branch, extend the existing OR:

```ts
query = query.or(
  'calendar_name.ilike.%GAE%,calendar_name.ilike.%In-person%,parsed_pathology_info->>procedure.eq.GAE'
);
```

Leave the `Virtual (Unspecified)` branch unchanged — that intentionally targets rows with no procedure token at all.

### 3. No changes to

- Location filter SQL — it already excludes Virtual when a physical city is selected.
- The dropdown option builders — they already collapse virtual rows to `Virtual`.
- `calendarUtils.getEventTypeFromCalendar` — already accepts a pathology fallback for color/badge classification.

### Verification

- Open Ventra portal, filter by `Great Neck` → virtual rows no longer appear.
- Filter by `Virtual` → only virtual rows appear (no duplicates under Great Neck).
- Filter by `UFE` → bare `Virtual Consultation` Ventra patients whose `parsed_pathology_info.procedure = 'UFE'` now show up.
- Calendar Day/Week/Month and the Upcoming Events panel show virtual rows under the Virtual location chip, not under Great Neck.
- Spot-check a non-Ventra project (e.g., VSNC, where Virtual is already a real location) to confirm no regression.