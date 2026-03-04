

## Pass Location Filter to Upcoming Events Panel

### Problem
The calendar grid correctly filters appointments by selected locations, but the "Events This Week/Day/Month" sidebar panel fetches its own data independently and does not apply the location filter.

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/UpcomingEventsPanel.tsx` | Add `selectedLocations` and `selectedEventTypes` optional props. After fetching, filter the displayed appointments client-side using the same `extractLocationFromCalendarName` logic already used in `CalendarDetailView`. |
| `src/components/appointments/CalendarDetailView.tsx` | Pass `selectedLocations` and `selectedEventTypes` through to `UpcomingEventsPanel` (lines 117-122). |

### Detail

**UpcomingEventsPanel.tsx** — add props and a filtering memo:
```typescript
interface UpcomingEventsPanelProps {
  // ...existing
  selectedEventTypes?: string[];
  selectedLocations?: string[];
}

// After fetching, filter before rendering:
const filteredAppointments = useMemo(() => {
  let result = appointments;
  if (selectedEventTypes?.length) {
    result = result.filter(apt => selectedEventTypes.includes(getEventTypeFromCalendar(apt.calendar_name).type));
  }
  if (selectedLocations?.length) {
    result = result.filter(apt => {
      const loc = extractLocationFromCalendarName(apt.calendar_name || '');
      return !loc || selectedLocations.includes(loc);
    });
  }
  return result;
}, [appointments, selectedEventTypes, selectedLocations]);
```

**CalendarDetailView.tsx** — pass the props:
```tsx
<UpcomingEventsPanel 
  projectName={projectName}
  viewMode={viewMode}
  selectedDate={selectedDate}
  onAppointmentClick={onAppointmentClick}
  selectedEventTypes={selectedEventTypes}
  selectedLocations={selectedLocations}
/>
```

Two files, minimal changes.

