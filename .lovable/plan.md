
# Plan: Filter Inactive Appointments from Calendar View

## Problem

The calendar view currently displays **all** appointments including Cancelled and OON (Out of Network) appointments. This creates visual clutter and confusion since these appointments are no longer active or schedulable.

**Current behavior**: Calendar shows Cancelled and OON appointments mixed with active ones
**Expected behavior**: Calendar only shows active/schedulable appointments (Confirmed, Welcome Call, Showed, No Show, Rescheduled, etc.)

---

## Solution

Add status filtering to the calendar data fetch and upcoming events query to exclude Cancelled and OON appointments.

### Statuses to Exclude:
| Status | Reason |
|--------|--------|
| Cancelled | Terminal - appointment was cancelled |
| Canceled | Alternate spelling |
| OON | Out of Network - not schedulable |

### Statuses to Keep:
- Confirmed
- Welcome Call
- Scheduled
- Pending
- New
- Showed (historical reference)
- No Show (historical reference)
- Rescheduled
- Do Not Call

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useCalendarAppointments.tsx` | Add status filter to exclude Cancelled and OON from database query |
| `src/components/appointments/UpcomingEventsPanel.tsx` | Add status filter to exclude Cancelled and OON from upcoming events query |

---

## Technical Implementation

### 1. `useCalendarAppointments.tsx` (lines 61-66)

Update the Supabase query to exclude inactive statuses:

```typescript
let query = supabase
  .from('all_appointments')
  .select('*')
  .gte('date_of_appointment', startDate)
  .lte('date_of_appointment', endDate)
  .or('is_reserved_block.is.null,is_reserved_block.eq.false')  // Existing reserved block filter
  .not('status', 'ilike', 'cancelled')
  .not('status', 'ilike', 'canceled')
  .not('status', 'ilike', 'oon')
  .order('date_of_appointment', { ascending: true });
```

**Note**: Using `ilike` for case-insensitive matching since statuses may have varying capitalization.

### 2. `UpcomingEventsPanel.tsx` (lines 27-34)

Update the upcoming events query to exclude inactive statuses:

```typescript
const { data, error } = await supabase
  .from('all_appointments')
  .select('*')
  .eq('project_name', projectName)
  .gte('date_of_appointment', today)
  .or('is_reserved_block.is.null,is_reserved_block.eq.false')
  .not('status', 'ilike', 'cancelled')
  .not('status', 'ilike', 'canceled')
  .not('status', 'ilike', 'oon')
  .order('date_of_appointment', { ascending: true })
  .order('requested_time', { ascending: true })
  .limit(10);
```

---

## Consistency with Existing Patterns

This follows the existing filtering pattern used in:
- `src/components/appointments/utils.ts` line 97: `completedStatuses = ['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon']`
- `src/hooks/useMasterDatabase.tsx` line 45: `.or('is_reserved_block.is.null,is_reserved_block.eq.false')`

**Design decision**: We keep "Showed" and "No Show" visible in the calendar for historical context (knowing what happened on past dates), but exclude Cancelled and OON since they represent appointments that won't happen.

---

## Expected Outcome

After implementation:
- Calendar Day/Week/Month views will only show active appointments
- Upcoming Events sidebar will only show active appointments
- Cancelled appointments will not clutter the calendar
- OON appointments will not appear (as they're not schedulable)
- Reserved time blocks continue to display correctly with their distinct styling
- Appointment counts per day will reflect only active appointments

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Status is NULL | Appointment shows (new/unprocessed) |
| Status is empty string | Appointment shows |
| Status is "CANCELLED" (uppercase) | Filtered out (ilike is case-insensitive) |
| Reserved blocks | Continue to show with gray styling |
| Past cancelled appointments | Filtered out (reduces historical clutter) |
