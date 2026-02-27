

## Add Location Filter to Calendar View

### Problem
Clinics with multiple locations (e.g., Joint & Vascular Institute, Texas Vascular) have no way to filter the calendar view by location. The list view already has location filtering via `AppointmentFilters.tsx`, but the calendar view only has event type filtering.

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/LocationLegend.tsx` | **New file.** A toggleable location filter component (styled like `EventTypeLegend`) that extracts unique locations from `calendar_name` using the existing regex patterns (`/ - (.+)$/`, `/at\s+(.+)$/`, `/Consultation\s+(.+)$/i`). Each location rendered as a clickable chip with a colored dot. |
| `src/pages/ProjectPortal.tsx` | Add `selectedLocations` state array. Render `LocationLegend` below `EventTypeLegend` when in calendar view. Pass `selectedLocations` down to `CalendarDetailView`. |
| `src/components/appointments/CalendarDetailView.tsx` | Accept new `selectedLocations` prop. Filter appointments by matching `calendar_name` against selected locations (same regex extraction). |
| `src/hooks/useCalendarAppointments.tsx` | Optionally accept `locationFilter` and apply `.ilike('calendar_name', '%location%')` to the query, or leave client-side filtering in `CalendarDetailView` for simplicity. |

### Detail

**LocationLegend.tsx** — Similar pattern to `EventTypeLegend`:
- Fetches distinct `calendar_name` values for the project
- Extracts locations using existing regex patterns (excluding legacy locations like Somerset, Milledgeville)
- Only renders if 2+ locations exist (no point showing filter for single-location clinics)
- Each location is a toggleable button; clicking toggles it in/out of the filter
- Uses `MapPin` icon and neutral dot colors (slate/zinc palette to differentiate from event type colors)

**ProjectPortal.tsx** — Add state and wire up:
```typescript
const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

// Below EventTypeLegend:
<LocationLegend
  projectName={project.project_name}
  selectedLocations={selectedLocations}
  onToggleLocation={(loc) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  }}
/>
```

**CalendarDetailView.tsx** — Client-side filter (same approach as event type filtering):
```typescript
// After event type filtering, also filter by location
if (selectedLocations.length > 0) {
  filteredApts = filteredApts.filter(apt => {
    const loc = extractLocationFromCalendar(apt.calendar_name);
    return !loc || selectedLocations.includes(loc);
  });
}
```

