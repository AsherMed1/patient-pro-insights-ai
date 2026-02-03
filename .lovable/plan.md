
# Plan: Display Reserved Time Blocks with Full Duration in Day View

## Problem

When reserving a time block from 10 AM to 1 PM, the calendar day view only shows the block in the 10 AM slot instead of spanning/graying out all hours from 10 AM to 1 PM. The screenshot shows "Test block off" only appearing at 10 AM while the intended block covers 10 AM - 1 PM (3 hours).

## Root Cause Analysis

1. **Missing `end_time` column**: The `all_appointments` table only has `requested_time` (start time) - there's no column to store the block's end time
2. **End time buried in notes**: The end time (13:00) is stored in `patient_intake_notes` as text: "Time: 10:00 - 13:00"
3. **Day view only uses start hour**: `CalendarDayView` groups appointments by their start hour and renders each as a single-slot card

## Solution Overview

Add an `reserved_end_time` column to the database and update the UI to render reserved blocks spanning multiple time slots.

---

## Implementation Steps

### Step 1: Add Database Column

Add a `reserved_end_time` column to the `all_appointments` table to store the end time for reserved blocks.

```sql
ALTER TABLE all_appointments 
ADD COLUMN reserved_end_time TIME;
```

### Step 2: Update ReserveTimeBlockDialog

When creating a reserved block, save the end time to the new column:

```typescript
// In handleSubmit(), update the insert:
.insert({
  // ...existing fields
  requested_time: formatInTimeZone(startUtc, tz, 'HH:mm'),
  reserved_end_time: formatInTimeZone(endUtc, tz, 'HH:mm'), // NEW
  // ...
})
```

### Step 3: Update Types

Add `reserved_end_time` to the `AllAppointment` interface in `types.ts`:

```typescript
export interface AllAppointment {
  // ...existing fields
  reserved_end_time?: string | null;
}
```

### Step 4: Update CalendarDayView Rendering

Modify the day view to:
1. Calculate how many hour slots a reserved block spans
2. Render the block across multiple slots with visual continuity
3. Gray out intermediate hours to indicate they're blocked

**Key visual changes:**
- Reserved blocks will span multiple time slots vertically
- Intermediate hours will show a continuation indicator (dashed line or grayed area)
- The block card will have increased height based on duration

### Step 5: Backfill Existing Reserved Blocks

Parse existing `patient_intake_notes` to extract end times and populate the new column:

```sql
UPDATE all_appointments 
SET reserved_end_time = (
  regexp_match(patient_intake_notes, 'Time: \d{2}:\d{2} - (\d{2}:\d{2})')
)[1]::time
WHERE is_reserved_block = true 
AND reserved_end_time IS NULL;
```

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add `reserved_end_time` column |
| `src/components/appointments/types.ts` | Add `reserved_end_time` to interface |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Save end time when creating block |
| `src/components/appointments/CalendarDayView.tsx` | Render blocks spanning multiple slots |
| `src/hooks/useCalendarAppointments.tsx` | Include new column in query |

---

## Visual Result

```text
Before:                          After:
+--------+-----------------+     +--------+----------------------+
| 10 AM  | RSV Test block  |     | 10 AM  | RSV Test block off   |
+--------+-----------------+     |        |                      |
| 11 AM  |                 |     | 11 AM  | ┊ (blocked)          |
+--------+-----------------+     |        |                      |
| 12 PM  |                 |     | 12 PM  | ┊ (blocked)          |
+--------+-----------------+     |        |                      |
| 1 PM   |                 |     +--------+----------------------+
+--------+-----------------+     | 1 PM   |                      |
```

---

## Technical Approach for Multi-Slot Rendering

The key challenge is rendering a block that spans multiple hour slots. Two approaches:

**Option A: Absolute Positioning (Recommended)**
- Calculate block height based on duration: `height = (endHour - startHour) * slotHeight`
- Position block absolutely within the time grid
- Simple math, clean visual appearance

**Option B: Mark Hours as Blocked**
- Track which hours are "covered" by a multi-hour block
- Render continuation indicators in those slots
- More complex logic but works with existing grid structure

I recommend Option A as it provides a cleaner visual representation.

---

## Summary

This change requires:
1. One database migration (add column)
2. Type definition update
3. Save logic update in the reserve dialog
4. Major visual update to CalendarDayView for multi-slot rendering
5. Backfill script for existing data
