

## Remove "Do Not Call" Appointments from Calendar Views

The calendar query in `useCalendarAppointments.tsx` already excludes cancelled, OON, and no-show statuses but is missing "Do Not Call." Adding two `.not()` filters will remove these from the calendar grid and the upcoming events sidebar.

### Changes

**File: `src/hooks/useCalendarAppointments.tsx`** (line ~70)

Add after the existing `.not('status', 'ilike', 'noshow')` line:

```typescript
.not('status', 'ilike', 'do not call')
.not('status', 'ilike', 'donotcall')
```

This covers both spelling variants used in the system. One file, two lines added.

