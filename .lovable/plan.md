

# Plan: Add Manual Time Entry with Dropdown Support

## Problem

Some clinics use 15-minute appointment intervals (e.g., 9:15, 9:45), which are not available in the current 10-minute interval dropdown. Staff need the flexibility to type any time they need.

## Solution

Replace the pure `Select` dropdown with a hybrid **Combobox-style input** that allows:
1. **Quick selection** from a dropdown of common times (keeping 10-minute intervals)
2. **Manual typing** for any custom time (supporting 15-minute or any other interval)

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Replace Select with Combobox/Input hybrid |

---

## Technical Approach

Create a new `TimeInput` component that combines:
- A text input field where users can type times (e.g., "9:15 AM" or "14:45")
- A dropdown button that opens a list of preset times for quick selection
- Automatic parsing and normalization of typed values to `HH:mm` format

### Component Design

```
+---------------------------+---+
| 9:15 AM                   | v |  <- Input field + dropdown trigger
+---------------------------+---+
| 9:00 AM                       |  <- Dropdown options
| 9:10 AM                       |
| 9:20 AM                       |
| 9:30 AM                       |
| ...                           |
+-------------------------------+
```

---

## Implementation Details

### 1. Create TimeInput Component (within the file)

```typescript
interface TimeInputProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  placeholder?: string;
}

function TimeInput({ value, onChange, placeholder }: TimeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Convert HH:mm to display format (e.g., "9:15 AM")
  const formatForDisplay = (time: string) => { ... };
  
  // Parse user input to HH:mm format
  const parseTimeInput = (input: string): string | null => {
    // Handle formats: "9:15", "9:15 AM", "09:15", "915", "9 15 am"
    // Return null if invalid
  };
  
  // On blur, validate and normalize the input
  const handleBlur = () => {
    const parsed = parseTimeInput(inputValue);
    if (parsed) {
      onChange(parsed);
    } else {
      // Reset to current value if invalid
      setInputValue(formatForDisplay(value));
    }
  };
}
```

### 2. Time Parsing Logic

Support multiple input formats for user convenience:
- `9:15` or `09:15` (24-hour implied before noon)
- `9:15 AM` or `9:15am` or `9:15 a`
- `9:15 PM` or `9:15pm` or `9:15 p`
- `915` (interpreted as 9:15)
- `1430` (interpreted as 14:30 / 2:30 PM)

### 3. Validation Enhancement

Add format validation to `validateTimeRanges()`:
```typescript
// Validate time format (HH:mm)
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
if (!timeFormatRegex.test(range.startTime) || !timeFormatRegex.test(range.endTime)) {
  toast({
    title: 'Invalid Time Format',
    description: 'Please enter a valid time (e.g., 9:15 AM)',
    variant: 'destructive',
  });
  return false;
}
```

---

## User Experience

| Action | Before | After |
|--------|--------|-------|
| Select 9:30 AM | Click dropdown, scroll, click | Click dropdown, scroll, click (same) |
| Enter 9:15 AM | Not possible | Type "9:15" or "9:15 AM" in input |
| Enter 2:45 PM | Not possible | Type "2:45 PM" or "14:45" in input |

---

## Updated TimeRangeRow Component

```typescript
function TimeRangeRow({ range, isLast, canDelete, onUpdate, onAdd, onRemove }: TimeRangeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <TimeInput 
        value={range.startTime} 
        onChange={(v) => onUpdate(range.id, 'startTime', v)} 
      />

      <span className="text-muted-foreground text-sm">To</span>

      <TimeInput 
        value={range.endTime} 
        onChange={(v) => onUpdate(range.id, 'endTime', v)} 
      />

      {/* Add/Remove buttons remain the same */}
    </div>
  );
}
```

---

## Edge Cases Handled

| Input | Interpretation |
|-------|----------------|
| `915` | 9:15 AM |
| `1430` | 2:30 PM |
| `9:15 pm` | 21:15 |
| `12:00 AM` | 00:00 |
| `12:00 PM` | 12:00 |
| `invalid` | Shows error, reverts to previous value |

---

## Backward Compatibility

- Existing time values in `HH:mm` format continue to work
- Dropdown still shows 10-minute intervals for quick selection
- No database or API changes required

