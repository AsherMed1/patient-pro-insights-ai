

## Two Fixes: Remove "No Show" from Calendar + Fix Status Color Coding

### Problem 1: No Show patients visible on calendar
The query in `useCalendarAppointments.tsx` (line 66-68) filters out `cancelled`, `canceled`, and `oon` but does NOT filter out `no show` or `noshow`. Same issue in `UpcomingEventsPanel.tsx`.

### Problem 2: All status badges look the same
The `getStatusInfo()` function in `calendarUtils.ts` returns generic badge variants (`default`, `secondary`, `outline`, `destructive`) instead of the custom color-coded variants already defined in `badge.tsx` (`showed`, `confirmed`, `noshow`, `cancelled`, `rescheduled`, `oon`, `welcomeCall`, `doNotCall`).

### Changes

| File | Change |
|------|--------|
| `src/hooks/useCalendarAppointments.tsx` | Add `.not('status', 'ilike', 'no show')` and `.not('status', 'ilike', 'noshow')` filters to the query |
| `src/components/appointments/UpcomingEventsPanel.tsx` | Same "no show" filters added to its query |
| `src/components/appointments/calendarUtils.ts` | Update `getStatusInfo()` to return the correct color-coded badge variants (`showed`, `confirmed`, `noshow`, `cancelled`, `rescheduled`, `oon`, `welcomeCall`, `doNotCall`) instead of generic ones |

### Technical Detail

**Filter fix** (both `useCalendarAppointments.tsx` and `UpcomingEventsPanel.tsx`):
```typescript
.not('status', 'ilike', 'no show')
.not('status', 'ilike', 'noshow')
```

**Status color fix** (`calendarUtils.ts` `getStatusInfo`):
```typescript
switch (normalizedStatus) {
  case 'showed':
    return { label: 'Showed', variant: 'showed' };
  case 'confirmed':
    return { label: 'Confirmed', variant: 'confirmed' };
  case 'cancelled':
    return { label: 'Cancelled', variant: 'cancelled' };
  case 'no show':
  case 'noshow':
    return { label: 'No Show', variant: 'noshow' };
  case 'rescheduled':
    return { label: 'Rescheduled', variant: 'rescheduled' };
  case 'oon':
    return { label: 'OON', variant: 'oon' };
  case 'welcome call':
    return { label: 'Welcome Call', variant: 'welcomeCall' };
  case 'do not call':
  case 'donotcall':
    return { label: 'Do Not Call', variant: 'doNotCall' };
  default:
    return { label: status || 'Scheduled', variant: 'outline' };
}
```

