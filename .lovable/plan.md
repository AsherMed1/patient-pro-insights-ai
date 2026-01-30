

# Plan: Route "Pending" Status Appointments to "Needs Review" Tab

## Problem Summary

When an appointment's status is set to "Pending", it remains in the "New" tab because:
1. The "New" tab filter only checks `internal_process_complete` (false/null)
2. The "Needs Review" tab filter requires the appointment date to be in the past or null

**Current behavior**: Pending status + IPC=false → stays in "New" tab
**Expected behavior**: Pending status → should route to "Needs Review" regardless of date

---

## Solution

Modify the tab filtering logic so that:
1. **"New" tab** excludes appointments with "Pending" status
2. **"Needs Review" tab** includes appointments with "Pending" status (in addition to past-date logic)

This ensures "Pending" is treated as a flag meaning "needs administrative attention."

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | Update database queries for "new" and "needs-review" tabs |
| `src/components/appointments/utils.ts` | Update `filterAppointments` function for client-side filtering |

---

## Technical Implementation

### 1. `src/components/AllAppointmentsManager.tsx`

**Location 1**: Lines 274-276 (New tab in `fetchAppointments` count query)
```typescript
// Before:
countQuery = countQuery.or('internal_process_complete.is.null,internal_process_complete.eq.false');

// After:
countQuery = countQuery
  .or('internal_process_complete.is.null,internal_process_complete.eq.false')
  .not('status', 'ilike', 'pending');  // Exclude Pending from New
```

**Location 2**: Lines 277-287 (Needs Review in `fetchAppointments` count query)
```typescript
// Before:
countQuery = countQuery
  .not('date_of_appointment', 'is', null)
  .lt('date_of_appointment', todayString)
  // ... other status filters

// After - include Pending OR past-date appointments:
countQuery = countQuery
  .or(`status.ilike.pending,and(date_of_appointment.lt.${todayString})`)
  .not('status', 'ilike', 'cancelled')
  .not('status', 'ilike', 'no show')
  // ... other terminal status exclusions
```

**Location 3**: Lines 404-406 (New tab in `fetchAppointments` data query)
Same change as Location 1.

**Location 4**: Lines 407-417 (Needs Review in `fetchAppointments` data query)
Same change as Location 2.

**Location 5**: Lines 545-547 (New tab in `fetchTabCounts`)
```typescript
const newQuery = getBaseQuery()
  .or('internal_process_complete.is.null,internal_process_complete.eq.false')
  .not('status', 'ilike', 'pending');  // Exclude Pending
```

**Location 6**: Lines 549-557 (Needs Review in `fetchTabCounts`)
```typescript
const needsReviewQuery = getBaseQuery()
  .or(`status.ilike.pending,date_of_appointment.is.null,date_of_appointment.lt.${todayString}`)
  .not('status', 'ilike', 'cancelled')
  .not('status', 'ilike', 'no show')
  .not('status', 'ilike', 'noshow')
  .not('status', 'ilike', 'showed')
  .not('status', 'ilike', 'won')
  .not('status', 'ilike', 'oon');
```

### 2. `src/components/appointments/utils.ts`

**Location**: Lines 107-113 (`filterAppointments` function)

```typescript
// Before (line 109-110):
case 'new':
  return !isCompleted && (appointment.internal_process_complete === false || ...);

// After:
case 'new':
  // New: IPC not complete AND status is not Pending (Pending goes to Needs Review)
  const isPending = normalizedStatus === 'pending';
  return !isCompleted && !isPending && (appointment.internal_process_complete === false || ...);

// Before (line 111-113):
case 'needs-review':
  return !isCompleted && (isInPast || !appointment.date_of_appointment) && (...);

// After:
case 'needs-review':
  // Needs Review: Pending status OR (past/null date with no final status)
  const isPendingStatus = normalizedStatus === 'pending';
  return !isCompleted && (isPendingStatus || isInPast || !appointment.date_of_appointment) && 
    (!appointment.status || appointment.status.trim() === '' || normalizedStatus === 'new' || isPendingStatus);
```

---

## Expected Outcome

| Status | Date | IPC | Tab Before | Tab After |
|--------|------|-----|------------|-----------|
| Pending | Future | false | New | **Needs Review** |
| Pending | Past | false | New | **Needs Review** |
| Pending | null | false | New | **Needs Review** |
| Confirmed | Future | false | New | New (unchanged) |
| null/New | Past | false | Needs Review | Needs Review (unchanged) |

---

## Acceptance Criteria Validation

| Criteria | Solution |
|----------|----------|
| Setting status to Pending places patient in Needs Review | Pending status triggers Needs Review filter |
| Tab placement updates immediately | Refetch after status update ensures instant UI update |
| Not blocked by New tab | New tab explicitly excludes Pending status |

