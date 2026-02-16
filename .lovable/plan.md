
# Fix: Appointment Date Sorting Uses Wrong Column

## Problem
When sorting by "Oldest First" or "Newest First" under Appt Date, the query always sorts by `created_at` (the record creation timestamp) instead of `date_of_appointment` (the actual appointment date). This means the sort order doesn't match what users expect when they have "Appt Date" selected as their date type.

## Root Cause
In `AllAppointmentsManager.tsx` line 336, the sort column is hardcoded to `created_at`:

```typescript
} else if (sortBy === 'date_asc' || sortBy === 'date_desc') {
  appointmentsQuery = appointmentsQuery.order('created_at', { ascending: sortBy === 'date_asc', nullsFirst: false });
}
```

It ignores the `dateFilterType` toggle entirely.

## Fix

**File: `src/components/AllAppointmentsManager.tsx`** (line 335-336)

Change the sort column to respect the date type toggle:

```typescript
} else if (sortBy === 'date_asc' || sortBy === 'date_desc') {
  const sortColumn = dateFilterType === 'created' ? 'created_at' : 'date_of_appointment';
  appointmentsQuery = appointmentsQuery.order(sortColumn, { ascending: sortBy === 'date_asc', nullsFirst: false });
}
```

When the user has "Appt Date" selected (the default), sorting uses `date_of_appointment`. When "Created Date" is selected, sorting uses `created_at`. This makes the sort consistent with the active date filter.
