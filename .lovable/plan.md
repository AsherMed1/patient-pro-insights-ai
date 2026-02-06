

# Plan: Fix "This Month" Quick Filter to Select Entire Month

## Problem

The "This Month" quick filter currently selects from the first of the month to today's date (Feb 1 - Feb 6), rather than the entire month (Feb 1 - Feb 28).

## Root Cause

In `AppointmentFilters.tsx`, the month case sets:
```typescript
case 'month':
  onDateRangeChange({
    from: startOfMonth(today),
    to: today  // ← This is the issue - should be endOfMonth
  });
```

## Solution

1. Add `endOfMonth` to the date-fns imports
2. Change the `to` value from `today` to `endOfMonth(today)`

## Technical Changes

### File: `src/components/appointments/AppointmentFilters.tsx`

**Line 10 - Update imports:**
```typescript
// Before:
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

// After:
import { format, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
```

**Lines 188-192 - Update month case:**
```typescript
// Before:
case 'month':
  onDateRangeChange({
    from: startOfMonth(today),
    to: today
  });
  break;

// After:
case 'month':
  onDateRangeChange({
    from: startOfMonth(today),
    to: endOfMonth(today)
  });
  break;
```

## Result

After this change, clicking "This Month" will select:
- **From:** First day of current month (Feb 1, 2026)
- **To:** Last day of current month (Feb 28, 2026)

This includes both past and future appointments within the current month.

