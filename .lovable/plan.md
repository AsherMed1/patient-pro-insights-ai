

## Add Status Filter to Calendar View

### Overview
Currently the calendar query hard-codes exclusions for Cancelled, OON, No Show, Do Not Call, and Rescheduled statuses. This plan adds a "Status Filter" legend (similar to the existing EventTypeLegend) that lets clinic staff toggle additional statuses on/off, while keeping the current visible statuses (Confirmed, Welcome Call, Showed, Scheduled/Pending) as defaults.

### Architecture

The status filtering will move from the database query level to the client-side level — the query will fetch **all** appointments (no status exclusions), and filtering will happen in `CalendarDetailView` alongside the existing event type and location filters.

### Files to Change

**1. New Component: `src/components/appointments/StatusFilterLegend.tsx`**
- Renders clickable status chips similar to `EventTypeLegend`
- Statuses: Confirmed, Welcome Call, Showed, Scheduled (default ON) + Cancelled, No Show, OON, Rescheduled, Do Not Call (default OFF)
- Each chip shows a colored dot matching the existing status badge color scheme
- Toggling a status on/off updates the parent's `selectedStatuses` state

**2. `src/hooks/useCalendarAppointments.tsx`**
- Remove the 6 hard-coded `.not('status', 'ilike', ...)` filters from the query (lines 66-72)
- Fetch all appointments for the date range regardless of status

**3. `src/components/appointments/UpcomingEventsPanel.tsx`**
- Same change: remove hard-coded status exclusions (lines 59-65)
- Accept `selectedStatuses` prop and filter client-side alongside existing event type/location filters

**4. `src/components/appointments/CalendarDetailView.tsx`**
- Accept new `selectedStatuses` prop
- Apply status filtering in the existing `filteredByDate` memo alongside event type and location filters

**5. `src/pages/ProjectPortal.tsx`**
- Add `selectedStatuses` state, initialized with default visible statuses: `['confirmed', 'welcome call', 'showed', 'scheduled', 'pending', '']` (empty string catches null/unset statuses)
- Render `StatusFilterLegend` alongside existing `EventTypeLegend` and `LocationLegend`
- Pass `selectedStatuses` to `CalendarDetailView`

### Default Behavior
- On load, only Confirmed, Welcome Call, Showed, and Scheduled/Pending are active (matching current behavior)
- Clinic staff can toggle on Cancelled, No Show, OON, Rescheduled, Do Not Call to see those appointments
- Toggled-on terminal statuses will render with slightly muted/strikethrough styling in the calendar to visually distinguish them

### Visual Design
- Placed below the EventTypeLegend row, labeled "Statuses:"
- Each chip uses the existing status color scheme (green for Showed, blue for Confirmed, red for Cancelled, etc.)
- Active chips are filled; inactive chips are outlined/dimmed

