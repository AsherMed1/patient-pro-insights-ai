
# Add Created Date Filter to Appointments

## Overview

Add a "date type" toggle to the existing Dates filter section, letting users choose whether the date range applies to **Appointment Date** (current behavior) or **Created Date** (when the record was created). No database changes needed -- the `date_appointment_created` and `created_at` columns already exist.

## Changes

### 1. `src/components/appointments/AppointmentFilters.tsx`

- Add a new prop `dateFilterType` (`'appointment' | 'created'`) and its change handler `onDateFilterTypeChange`
- Inside the collapsible Dates section, add a segmented toggle (two pill buttons) before the quick-date pills:
  - **Appt Date** (default) -- filters by `date_of_appointment`
  - **Created Date** -- filters by `date_appointment_created`
- Show the active date type in the active filter chip (e.g., "Created: Jan 01 - Jan 31")

### 2. `src/components/AllAppointmentsManager.tsx`

- Add new state: `dateFilterType` (default `'appointment'`)
- Pass the new props to `AppointmentFilters`
- Update **both** the count query and data query to use the selected column:
  - When `'appointment'`: filter on `date_of_appointment` (current behavior)
  - When `'created'`: filter on `date_appointment_created`
- Include `dateFilterType` in the dependency array of the `fetchAppointments` effect
- Update the `clearFilters` handler to reset `dateFilterType` to `'appointment'`

### 3. No database changes required

The `all_appointments` table already has:
- `date_of_appointment` (appointment/scheduled date)
- `date_appointment_created` (when the record was created)
- `created_at` (row insertion timestamp)

We will use `date_appointment_created` for the "Created Date" filter since it is a date field that aligns with the existing date-range picker format.

## Technical Details

**New state in AllAppointmentsManager:**
```typescript
const [dateFilterType, setDateFilterType] = useState<'appointment' | 'created'>('appointment');
```

**Query logic change (applied in two places -- count query and data query):**
```typescript
const dateColumn = dateFilterType === 'created' ? 'date_appointment_created' : 'date_of_appointment';

if (dateRange.from) {
  query = query.gte(dateColumn, format(dateRange.from, 'yyyy-MM-dd'));
}
if (dateRange.to) {
  query = query.lte(dateColumn, format(dateRange.to, 'yyyy-MM-dd'));
}
```

**New props on AppointmentFilters:**
```typescript
dateFilterType: 'appointment' | 'created';
onDateFilterTypeChange: (type: 'appointment' | 'created') => void;
```

**UI in the Dates collapsible section** (before the Today/This Week/This Month pills):
```
[Appt Date] [Created Date]   |   Today   This Week   This Month   |   Start → End
```

Two small pill-style buttons with active state styling to indicate which date column is being filtered.

**Filter chip update:**
The date range badge will show "Appt: Jan 01 - Jan 31" or "Created: Jan 01 - Jan 31" depending on the selected type.
