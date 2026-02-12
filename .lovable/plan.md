

# Fix Missing Statuses in Calendar Detail View Dropdown

## Problem
The status dropdown in the calendar's Detailed Appointment View (DetailedAppointmentView.tsx) has only 6 hardcoded statuses: Confirmed, Showed, No Show, Cancelled, Rescheduled, OON.

The rest of the app uses a shared `statusOptions` list from `src/components/appointments/utils.ts` which includes 11 statuses:
- New, Pending, Confirmed, Scheduled, Showed, No Show, Cancelled, Rescheduled, Welcome Call, OON, Do Not Call

The calendar view is missing: **New, Pending, Scheduled, Welcome Call, Do Not Call**.

## Fix

### File: `src/components/appointments/DetailedAppointmentView.tsx` (~line 641-648)

Replace the 6 hardcoded `<SelectItem>` entries with a dynamic list using the shared `statusOptions` array imported from `./utils`.

1. Add import: `import { statusOptions } from './utils';`
2. Replace the hardcoded items with:
```tsx
<SelectContent className="bg-popover z-[9999]">
  {statusOptions.sort().map((status) => (
    <SelectItem key={status} value={status}>{status}</SelectItem>
  ))}
</SelectContent>
```

This ensures the calendar detail view stays in sync with the rest of the app whenever statuses are added or changed.

