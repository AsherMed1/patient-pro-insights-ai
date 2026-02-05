

# Plan: Bulk Calendar Blocking Feature

## Overview

Add the ability to block multiple calendars at once when reserving time, enabling clinics to efficiently manage provider time-off or closures across multiple service calendars in a single operation.

---

## User Experience

### Current Flow
1. User opens "Reserve Time Block" dialog
2. User selects a single calendar from dropdown
3. User submits - block created on one calendar only
4. User repeats for each additional calendar (tedious for 6-8 calendars)

### New Flow
1. User opens "Reserve Time Block" dialog
2. User sees calendar list with checkboxes instead of dropdown
3. User can use "Select All" / "Deselect All" quick actions
4. User checks desired calendars (1 or more)
5. User submits - blocks created across all selected calendars in parallel
6. User sees summary: "Created X blocks across Y calendars"

---

## UI Changes

### Calendar Selection Section

Replace the single `<Select>` dropdown with a checkbox list:

```
Calendar(s)                    [Select All] [Deselect All]
┌─────────────────────────────────────────────────────────┐
│ ☑ Request your Virtual GAE Consultation                │
│ ☑ Request your Neuropathy Consultation at Cary, NC     │
│ ☐ Call Back Request [FOR APPT SETTERS ONLY]            │
│ ☑ Request your GAE Consultation at Cary, NC            │
└─────────────────────────────────────────────────────────┘
Selected: 3 of 4 calendars
```

**Features:**
- Scrollable list (max-height with overflow) for clinics with many calendars
- "Select All" and "Deselect All" text buttons for quick selection
- Counter showing "X of Y calendars selected"
- Maintains existing styling (rounded border, muted background)

---

## Technical Implementation

### Step 1: Update State Management

**File: `src/components/appointments/ReserveTimeBlockDialog.tsx`**

Change from single calendar ID to array of selected calendar IDs:

```typescript
// OLD
const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

// NEW
const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
```

### Step 2: Create Calendar Checkbox List Component

Add a new sub-component within the dialog file for the multi-select UI:

```typescript
interface CalendarCheckboxListProps {
  calendars: GHLCalendar[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function CalendarCheckboxList({ calendars, selectedIds, onSelectionChange }: CalendarCheckboxListProps) {
  const toggleCalendar = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(cid => cid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onSelectionChange(calendars.map(c => c.id));
  const deselectAll = () => onSelectionChange([]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Calendar(s)</Label>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
        </div>
      </div>
      <div className="rounded-lg border p-3 bg-muted/30 max-h-48 overflow-y-auto space-y-2">
        {calendars.map((calendar) => (
          <div key={calendar.id} className="flex items-center gap-2">
            <Checkbox
              id={calendar.id}
              checked={selectedIds.includes(calendar.id)}
              onCheckedChange={() => toggleCalendar(calendar.id)}
            />
            <label htmlFor={calendar.id} className="text-sm cursor-pointer">
              {calendar.name}
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedIds.length} of {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
```

### Step 3: Update Submit Handler

Modify `handleSubmit` to iterate over all selected calendars:

```typescript
const handleSubmit = async () => {
  if (!selectedDate || selectedCalendarIds.length === 0) {
    toast({
      title: 'Missing Information',
      description: 'Please select a date and at least one calendar.',
      variant: 'destructive',
    });
    return;
  }

  // ... validation ...

  setIsSubmitting(true);

  try {
    const allCreatedAppointments = [];
    const failedCalendars = [];

    // Process each selected calendar
    for (const calendarId of selectedCalendarIds) {
      const selectedCalendar = calendars.find(c => c.id === calendarId);
      
      // Create blocks for each time range on this calendar
      for (const range of timeRanges) {
        try {
          // ... existing GHL creation logic ...
          // ... existing local record creation ...
          allCreatedAppointments.push({ calendarId, calendarName: selectedCalendar?.name, range });
        } catch (error) {
          failedCalendars.push(selectedCalendar?.name || calendarId);
        }
      }
    }

    // Show summary toast
    toast({
      title: 'Time Blocks Reserved',
      description: `Created ${allCreatedAppointments.length} block(s) across ${selectedCalendarIds.length} calendar(s)`,
    });

    // Update Slack notification to include all calendars
    // ...
  } catch (error) { /* ... */ }
};
```

### Step 4: Update Slack Notification

Modify the notification to list all blocked calendars:

```typescript
supabase.functions.invoke('notify-calendar-update', {
  body: {
    projectName,
    calendarName: selectedCalendarIds.length > 1 
      ? `${selectedCalendarIds.length} calendars` 
      : selectedCalendar?.name || 'Unknown Calendar',
    calendarNames: selectedCalendarIds.map(id => 
      calendars.find(c => c.id === id)?.name || 'Unknown'
    ),
    date: format(selectedDate, 'PPPP'),
    timeRanges: /* ... */,
    reason: reason || 'Not specified',
    blockedBy: userName || 'Portal User',
    isFullDay,
  }
});
```

### Step 5: Update notify-calendar-update Edge Function

**File: `supabase/functions/notify-calendar-update/index.ts`**

Add support for displaying multiple calendar names:

```typescript
interface CalendarUpdatePayload {
  projectName: string;
  calendarName: string;       // Summary text (e.g., "5 calendars")
  calendarNames?: string[];   // NEW: Array of individual calendar names
  date: string;
  timeRanges: string[];
  reason?: string;
  blockedBy: string;
  isFullDay: boolean;
}

// In the message blocks, display list of calendars if provided:
{
  type: 'mrkdwn',
  text: calendarNames && calendarNames.length > 1
    ? `*Calendars (${calendarNames.length}):*\n${calendarNames.map(n => `• ${n}`).join('\n')}`
    : `*Calendar:*\n${calendarName}`,
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Replace Select with checkbox list, update state to array, loop over calendars on submit |
| `supabase/functions/notify-calendar-update/index.ts` | Support `calendarNames` array for multi-calendar notifications |

---

## Edge Cases Handled

1. **Partial failures**: If some calendars fail to block, show warning with failed calendar names but still close dialog if any succeeded
2. **No calendars selected**: Validation prevents submission with helpful error message
3. **Loading state**: Button disabled during submission; shows "Reserving X blocks..."
4. **Empty calendar list**: Gracefully shows existing "No calendars available" message
5. **Long calendar names**: Text truncation with full name on hover (title attribute)

---

## Summary

This enhancement transforms the calendar blocking from a single-select to multi-select interface, reducing clicks from O(n) to O(1) for blocking n calendars. The implementation reuses existing components (Checkbox) and follows established patterns for form state management and GHL API integration.

