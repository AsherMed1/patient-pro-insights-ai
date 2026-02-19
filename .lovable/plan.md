
# Scope "Upcoming Events" Panel to the Current Calendar View

## Problem
The Upcoming Events sidebar always shows appointments from today onwards (hardcoded `gte('date_of_appointment', today)`), regardless of which view mode is active or which date period the user is browsing. If you're in Week view looking at Feb 15-21, the panel may show events far outside that week.

## Solution
Pass the `viewMode` and `selectedDate` into `UpcomingEventsPanel` so it can compute the correct date range — matching exactly what the calendar is displaying.

### Date Range Logic Per View
- **Day view**: show only that single day (`selectedDate`)
- **Week view**: show all appointments within that week (Sun–Sat containing `selectedDate`)
- **Month view**: show all appointments within that calendar month

### Panel Header
Update the panel title to reflect the current scope:
- Day: "Events for [Mon Feb 19]"
- Week: "Events This Week"
- Month: "Events This Month"

## Files Changed

### 1. `src/components/appointments/UpcomingEventsPanel.tsx`
- Add `viewMode` and `selectedDate` to `UpcomingEventsPanelProps`
- Compute `startDate` and `endDate` from the view mode using `date-fns` helpers:
  - Day: `format(selectedDate, 'yyyy-MM-dd')` for both start and end
  - Week: `startOfWeek(selectedDate)` → `endOfWeek(selectedDate)`
  - Month: `startOfMonth(selectedDate)` → `endOfMonth(selectedDate)`
- Replace the hardcoded `today` query with `gte(startDate)` and `lte(endDate)`
- Remove the `limit(10)` cap so all events in the range are shown
- Update the panel header text to reflect the period (e.g. "Events This Week")
- Re-fetch when `viewMode` or `selectedDate` changes (add them to the `useEffect` dependency array)

### 2. `src/components/appointments/CalendarDetailView.tsx`
- Pass `viewMode` and `selectedDate` as props to `<UpcomingEventsPanel />`:
  ```tsx
  <UpcomingEventsPanel 
    projectName={projectName}
    viewMode={viewMode}
    selectedDate={selectedDate}
    onAppointmentClick={onAppointmentClick}
  />
  ```

No other files need to change — the data fetching and display logic are entirely self-contained within `UpcomingEventsPanel`.
