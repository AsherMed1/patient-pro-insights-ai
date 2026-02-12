

# Add Date Range Filter & Quick Filters to Project Performance Summary

## Overview
Add a filter bar above the summary table with quick-select buttons (Today, This Week, This Month, All Time) and a custom date range picker, filtering calls by `call_datetime` and appointments by `date_of_appointment`.

## Changes

### File: `src/components/dashboard/ProjectCallSummaryTable.tsx`

1. **Add state** for date range (`from`/`to` as `Date | undefined`) defaulting to "All Time" (both undefined).

2. **Add filter bar** between the CardHeader and table:
   - Quick filter buttons: Today, This Week, This Month, All Time (pill-style, matching the existing appointment filter design)
   - Custom date range picker using two Popover/Calendar components for start and end dates
   - Active date shown as a dismissible Badge chip

3. **Apply date filters to queries**:
   - `all_calls`: filter on `call_datetime` using `.gte()` / `.lte()`
   - `all_appointments`: filter on `date_of_appointment` using `.gte()` / `.lte()`
   - Pass filters via the existing `fetchAllPaginated` callback parameter

4. **Re-fetch on date change**: Add `dateFrom` and `dateTo` to the `useEffect` dependency array so the table updates when filters change.

## Technical Details

- Uses existing `Calendar`, `Popover`, `Button`, and `Badge` components already imported elsewhere in the project
- Quick filter logic reuses `startOfWeek`, `startOfMonth`, `endOfMonth` from `date-fns` (already installed)
- Date values formatted with `format()` from `date-fns` for the picker button labels
- Consistent styling with the compact filter bar pattern used in `AppointmentFilters.tsx`

