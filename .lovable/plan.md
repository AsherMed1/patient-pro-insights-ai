

## Add PAD Event Type to Calendar

### Change

**File: `src/components/appointments/calendarUtils.ts`**

1. Add a PAD entry to the `EVENT_TYPES` array (before "Other") with a distinct color (red):
   ```typescript
   { type: 'PAD', shortName: 'PAD', borderColor: 'border-l-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30', textColor: 'text-red-700 dark:text-red-300', dotColor: 'bg-red-500' }
   ```

2. Add PAD detection in `getEventTypeFromCalendar()` — match `'PAD'` and `'PERIPHERAL'` in the calendar name (inserted before the PAE check to avoid false matches):
   ```typescript
   if (upperName.includes('PAD') || upperName.includes('PERIPHERAL')) {
     return EVENT_TYPES.find(e => e.type === 'PAD')!;
   }
   ```

This will make PAD appear in the Event Types legend as a red dot alongside GAE, PFE, and UFE for TVI (and any other clinic with PAD calendars).

