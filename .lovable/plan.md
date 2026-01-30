

# Plan: Change Time Block Intervals from 30 Minutes to 10 Minutes

## Problem

The ReserveTimeBlockDialog currently only allows selecting times in 30-minute intervals (e.g., 9:00, 9:30, 10:00). Some clinics have appointment slots of 20, 30, 40, or 60 minutes, requiring more granular time selection.

## Solution

Update the `TIME_SLOTS` constant to generate options every 10 minutes instead of every 30 minutes.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Update TIME_SLOTS array to use 10-minute intervals |

---

## Technical Implementation

**Location**: Lines 50-60

**Before** (30-minute intervals, 48 slots):
```typescript
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

**After** (10-minute intervals, 144 slots):
```typescript
const TIME_SLOTS = Array.from({ length: 144 }, (_, i) => {
  const hour = Math.floor(i / 6);
  const minute = (i % 6) * 10;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`,
  };
});
```

---

## Changes Explained

| Parameter | Before | After | Explanation |
|-----------|--------|-------|-------------|
| Array length | 48 | 144 | 24 hours × 6 intervals per hour = 144 |
| Hour calculation | `i / 2` | `i / 6` | 6 slots per hour instead of 2 |
| Minute calculation | `(i % 2) * 30` | `(i % 6) * 10` | 0, 10, 20, 30, 40, 50 instead of 0, 30 |

---

## Available Time Options After Change

The dropdown will now show:
- 12:00 AM, 12:10 AM, 12:20 AM, 12:30 AM, 12:40 AM, 12:50 AM
- 1:00 AM, 1:10 AM, 1:20 AM, ... 
- All the way through 11:50 PM

This enables clinics to reserve blocks matching their exact appointment durations (20min, 30min, 40min, 1hr, etc.).

---

## No Other Changes Required

- The validation logic uses actual time strings (`HH:mm`), so it works with any interval
- The GHL API accepts any valid ISO timestamp, not restricted to 30-minute intervals
- The database stores times as strings, fully compatible with 10-minute intervals

