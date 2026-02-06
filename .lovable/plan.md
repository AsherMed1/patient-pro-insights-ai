
# Plan: Display Note Timestamps in Viewer's Local Timezone

## Problem Summary

Notes in the portal show inconsistent timestamps because:
- When a user creates/triggers a note, the timestamp embedded in the note text uses their local timezone
- When another user in a different timezone views the note, they see the original creator's timezone - not their own

For example, a status change made at 4:01 PM Central shows "Feb 4, 2026, 4:01 PM" to everyone, even viewers in Eastern Time who should see 5:01 PM.

---

## Current Implementation

### How timestamps get into notes:

**AllAppointmentsManager.tsx (line 656-665):**
```typescript
const timestamp = new Date().toLocaleString('en-US', { 
  month: 'short', 
  day: 'numeric', 
  year: 'numeric', 
  hour: 'numeric', 
  minute: '2-digit',
  hour12: true 
});
const systemNote = `Status changed from "${oldStatus}" to "${status}" - ${timestamp}`;
```

This uses `toLocaleString()` which formats the date in the **creator's browser timezone** and embeds it as plain text in the note.

---

## Solution Approach

### Strategy: Store UTC timestamps in a parseable format, render in viewer's local time

1. **Change note creation** to embed timestamps in an ISO format with a marker that can be detected and parsed at display time

2. **Update note display** to detect and transform embedded timestamps to the viewer's local timezone

---

## Technical Details

### Part 1: Update Note Creation to Embed UTC Timestamps

Modify how system notes embed timestamps using a parseable format:

```typescript
// Before (creator's local time, not parseable):
const systemNote = `Status changed from "${oldStatus}" to "${status}" - Feb 4, 2026, 4:01 PM`;

// After (UTC ISO with marker, parseable):
const utcTimestamp = new Date().toISOString();
const systemNote = `Status changed from "${oldStatus}" to "${status}" - [[timestamp:${utcTimestamp}]]`;
```

The `[[timestamp:...]]` marker allows the display layer to detect and convert timestamps.

**Files to update:**
- `src/components/AllAppointmentsManager.tsx` - status change notes

---

### Part 2: Create a Timestamp Parsing Utility

Add a new utility function in `src/utils/dateTimeUtils.ts`:

```typescript
/**
 * Replace [[timestamp:ISO]] markers with formatted local time
 */
export const formatEmbeddedTimestamps = (text: string): string => {
  // Pattern matches [[timestamp:2026-02-04T22:01:00.000Z]]
  const pattern = /\[\[timestamp:([^\]]+)\]\]/g;
  
  return text.replace(pattern, (match, isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return match; // Return original if parsing fails
    }
  });
};
```

This function:
- Finds all `[[timestamp:ISO]]` markers in text
- Converts each to the viewer's local timezone using `toLocaleString()`
- Returns the formatted text with human-readable local timestamps

---

### Part 3: Update Note Display Component

Modify `AppointmentNotes.tsx` to process note text through the formatter:

```typescript
import { formatEmbeddedTimestamps } from '@/utils/dateTimeUtils';

// In the render:
<p className={`text-sm whitespace-pre-wrap ${...}`}>
  {formatEmbeddedTimestamps(note.note_text)}
</p>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/dateTimeUtils.ts` | Add `formatEmbeddedTimestamps()` utility function |
| `src/components/AllAppointmentsManager.tsx` | Update status change note to use `[[timestamp:ISO]]` format |
| `src/components/appointments/AppointmentNotes.tsx` | Apply `formatEmbeddedTimestamps()` when rendering note text |

---

## Backward Compatibility

**Existing notes** that were created with the old format (plain text timestamps like "Feb 4, 2026, 4:01 PM") will continue to display as-is. They won't be converted since they don't have the `[[timestamp:...]]` marker.

**New notes** going forward will use the parseable format and display correctly in each viewer's local timezone.

---

## Migration Option (Future Enhancement)

If full consistency is needed for existing notes, a database migration script could:
1. Parse old timestamp formats from note text using regex
2. Convert detected timestamps to the `[[timestamp:ISO]]` format
3. Update the records

This is optional and can be done later if needed.

---

## Summary

This solution ensures:
- All **new notes** with timestamps will display in the viewer's local timezone
- The UTC timestamp is stored for accuracy (no timezone ambiguity)
- The display layer handles timezone conversion dynamically
- **Existing notes** continue to work (graceful degradation)
- No database schema changes required
