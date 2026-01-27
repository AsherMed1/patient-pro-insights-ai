

## Enhanced Reserve Time Block Dialog

### Overview

Update the `ReserveTimeBlockDialog` component to allow:
1. **Start + End time pickers** instead of duration dropdown
2. **Multiple time ranges** per reservation, similar to the reference screenshot

---

### Part 1: Update Time Selection UI

**Replace the current "Start Time + Duration" approach with "Start Time + End Time" selectors**

Current:
```
Start Time: [9:00 AM ▼]
Duration:   [1 hour ▼]
```

New:
```
When are you available?
[08:00 AM] (clock) To [05:00 PM] (clock)  [trash]
[06:00 PM] (clock) To [07:00 PM] (clock)  [+] [trash]
```

---

### Part 2: State Management Changes

**Replace single time/duration with array of time ranges:**

```typescript
// Current state
const [selectedTime, setSelectedTime] = useState<string>('09:00');
const [duration, setDuration] = useState<string>('60');

// New state structure
interface TimeRange {
  id: string;
  startTime: string;  // "09:00"
  endTime: string;    // "17:00"
}

const [timeRanges, setTimeRanges] = useState<TimeRange[]>([
  { id: '1', startTime: '09:00', endTime: '17:00' }
]);
```

---

### Part 3: Add/Remove Time Range Functions

**Add functions to manage multiple time ranges:**

```typescript
const addTimeRange = () => {
  setTimeRanges([
    ...timeRanges,
    { 
      id: Date.now().toString(), 
      startTime: '09:00', 
      endTime: '17:00' 
    }
  ]);
};

const removeTimeRange = (id: string) => {
  if (timeRanges.length > 1) {
    setTimeRanges(timeRanges.filter(range => range.id !== id));
  }
};

const updateTimeRange = (id: string, field: 'startTime' | 'endTime', value: string) => {
  setTimeRanges(timeRanges.map(range => 
    range.id === id ? { ...range, [field]: value } : range
  ));
};
```

---

### Part 4: Updated UI Layout

**New time range section with add/remove buttons:**

```text
+--------------------------------------------------+
|  Reserve Time Block                          [X] |
+--------------------------------------------------+
|                                                  |
|  Date:        [January 27, 2026    ] [Calendar]  |
|                                                  |
|  ┌────────────────────────────────────────────┐  |
|  │ When are you available?                    │  |
|  │                                            │  |
|  │ [08:00 AM ▼] To [05:00 PM ▼]         [🗑️]  │  |
|  │                                            │  |
|  │ [06:00 PM ▼] To [07:00 PM ▼]     [+] [🗑️]  │  |
|  └────────────────────────────────────────────┘  |
|                                                  |
|  Calendar:    [PAE Consult ▼]                    |
|                                                  |
|  Reason:      [___________________________]      |
|                                                  |
|  [Cancel]                            [Submit]    |
+--------------------------------------------------+
```

**Key UI elements:**
- Each row has Start Time dropdown, "To" label, End Time dropdown
- Trash icon to remove a time range (disabled if only one range)
- Plus icon on the last row to add a new time range
- Visual grouping with border/card styling

---

### Part 5: Enhanced Time Slot Options

**Add 30-minute intervals for more granular selection:**

```typescript
// Current: only hourly slots
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({ ... }));

// Enhanced: 30-minute intervals
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`,
  };
});
```

---

### Part 6: Submit Handler Updates

**Create multiple GHL appointments - one per time range:**

```typescript
const handleSubmit = async () => {
  // Validate all time ranges
  for (const range of timeRanges) {
    if (range.startTime >= range.endTime) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }
  }

  setIsSubmitting(true);

  try {
    const createdAppointments = [];

    // Create appointment for each time range
    for (const range of timeRanges) {
      const [startHours, startMinutes] = range.startTime.split(':').map(Number);
      const [endHours, endMinutes] = range.endTime.split(':').map(Number);
      
      const startDateTime = setMinutes(setHours(selectedDate, startHours), startMinutes);
      const endDateTime = setMinutes(setHours(selectedDate, endHours), endMinutes);

      // Call GHL API for each range
      const { data: ghlResult } = await supabase.functions.invoke('create-ghl-appointment', {
        body: {
          project_name: projectName,
          calendar_id: selectedCalendarId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          title: reason ? `Reserved - ${reason}` : 'Reserved',
          reason,
        },
      });

      // Create local record for each range
      await supabase.from('all_appointments').insert({
        project_name: projectName,
        lead_name: reason ? `Reserved - ${reason}` : 'Reserved',
        date_of_appointment: format(selectedDate, 'yyyy-MM-dd'),
        requested_time: format(startDateTime, 'HH:mm'),
        calendar_name: selectedCalendar?.name,
        status: 'Confirmed',
        is_reserved_block: true,
        ghl_appointment_id: ghlResult?.ghl_appointment_id,
        // ... other fields
      });

      createdAppointments.push({ range, ghlResult });
    }

    toast({
      title: 'Time Blocks Reserved',
      description: `Created ${createdAppointments.length} reservation(s) for ${format(selectedDate, 'PPP')}`,
    });

    onOpenChange(false);
    onSuccess?.();

  } catch (error) {
    // Error handling
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Part 7: Validation Enhancements

**Add validation for time range logic:**

```typescript
const validateTimeRanges = (): boolean => {
  for (const range of timeRanges) {
    // Check end time is after start time
    if (range.startTime >= range.endTime) {
      return false;
    }
  }
  
  // Optionally check for overlapping ranges
  for (let i = 0; i < timeRanges.length; i++) {
    for (let j = i + 1; j < timeRanges.length; j++) {
      if (rangesOverlap(timeRanges[i], timeRanges[j])) {
        return false;
      }
    }
  }
  
  return true;
};
```

---

### File Changes Summary

| File | Changes |
|------|---------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Major update: Replace duration with end time, add multiple time ranges support, update UI and submit logic |

---

### UI Component Details

**TimeRangeRow sub-component for cleaner code:**

```tsx
function TimeRangeRow({ 
  range, 
  isLast, 
  canDelete,
  onUpdate, 
  onAdd, 
  onRemove 
}: TimeRangeRowProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Start Time */}
      <Select value={range.startTime} onValueChange={(v) => onUpdate(range.id, 'startTime', v)}>
        <SelectTrigger className="w-[130px]">
          <Clock className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{/* TIME_SLOTS */}</SelectContent>
      </Select>

      <span className="text-muted-foreground">To</span>

      {/* End Time */}
      <Select value={range.endTime} onValueChange={(v) => onUpdate(range.id, 'endTime', v)}>
        <SelectTrigger className="w-[130px]">
          <Clock className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{/* TIME_SLOTS */}</SelectContent>
      </Select>

      {/* Add button (only on last row) */}
      {isLast && (
        <Button variant="ghost" size="icon" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {/* Delete button */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onRemove(range.id)}
        disabled={!canDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

