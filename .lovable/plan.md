

# Plan: Interactive Event Type Filter on Calendar View

## Overview

Turn the existing "Event Types" legend (currently display-only dots) into clickable toggle filters, similar to GHL's calendar. Clicking an event type will show/hide those appointments on the calendar. All types are enabled by default.

---

## How It Will Work

1. Each event type dot in the legend becomes a clickable toggle button
2. Active types are shown with full color; inactive types appear dimmed/struck-through
3. Only appointments matching the selected event types are displayed on the calendar
4. All types are selected by default when the calendar loads
5. The filter applies to Day, Week, and Month views

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/appointments/EventTypeLegend.tsx` | Make event type items clickable toggles; add `selectedTypes` and `onToggleType` props |
| `src/pages/ProjectPortal.tsx` | Add `selectedEventTypes` state; pass it to both `EventTypeLegend` and `CalendarDetailView` |
| `src/components/appointments/CalendarDetailView.tsx` | Accept `selectedEventTypes` prop; filter `appointmentsByDate` before passing to child views |

### EventTypeLegend Changes

- Add new props: `selectedTypes: string[]` and `onToggleType: (type: string) => void`
- Each legend item becomes a `button` with cursor-pointer
- Selected types show full color; deselected types show reduced opacity and a line-through style
- Toggling is instant (no re-fetch needed, filtering happens client-side)

### ProjectPortal Changes

- Add state: `const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])` (empty = all selected)
- Initialize with all active types once the legend loads
- Pass filter state to both `EventTypeLegend` and `CalendarDetailView`

### CalendarDetailView Changes

- Accept new prop: `selectedEventTypes?: string[]`
- Filter `appointmentsByDate` using `getEventTypeFromCalendar()` before passing data to Day/Week/Month views
- When `selectedEventTypes` is empty or undefined, show all (no filtering)

### Filtering Logic

```typescript
// In CalendarDetailView, filter appointments by selected event types
const filteredByDate = useMemo(() => {
  if (!selectedEventTypes || selectedEventTypes.length === 0) return appointmentsByDate;
  
  const filtered: Record<string, DayAppointmentData> = {};
  for (const [dateKey, dayData] of Object.entries(appointmentsByDate)) {
    const filteredApts = dayData.appointments.filter(apt => {
      const eventType = getEventTypeFromCalendar(apt.calendar_name);
      return selectedEventTypes.includes(eventType.type);
    });
    if (filteredApts.length > 0) {
      filtered[dateKey] = { ...dayData, appointments: filteredApts, count: filteredApts.length };
    } else {
      filtered[dateKey] = { ...dayData, appointments: [], count: 0 };
    }
  }
  return filtered;
}, [appointmentsByDate, selectedEventTypes]);
```

---

## UI Behavior

- **Default**: All event types selected (full color)
- **Click a type**: Toggles it on/off; dimmed types are excluded from the calendar
- **Visual feedback**: Deselected types get `opacity-40` styling
- **No data re-fetch**: Filtering is purely client-side on already-loaded data

