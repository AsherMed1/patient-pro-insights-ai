
# Plan: Fix GAE Filter in Tab Counts

## Problem

The GAE service filter is only showing 10 appointments in the tab counts, but there should be more since "GAE" and "In-person" were merged. The database shows 253 appointments match either pattern.

## Root Cause

The `fetchTabCounts` function in `AllAppointmentsManager.tsx` has a separate `getBaseQuery` function that applies filters for the tab counts. At lines 540-543, the service filter logic is missing the GAE/In-person merge:

```typescript
// Current code (MISSING the GAE merge logic)
if (serviceFilter !== 'ALL') {
  query = query.ilike('calendar_name', `%${serviceFilter}%`);
}
```

The main `fetchAppointments` function was updated correctly, but the `fetchTabCounts` function was not.

## Solution

Update the service filter in `fetchTabCounts` to include the same GAE/In-person merge logic:

```typescript
// Fixed code
if (serviceFilter !== 'ALL') {
  if (serviceFilter === 'GAE') {
    // GAE and In-person are the same service type
    query = query.or('calendar_name.ilike.%GAE%,calendar_name.ilike.%In-person%');
  } else {
    query = query.ilike('calendar_name', `%${serviceFilter}%`);
  }
}
```

---

## File to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/AllAppointmentsManager.tsx` | 540-543 | Add GAE/In-person merge logic to service filter in `fetchTabCounts` |

---

## Summary

This is a one-location fix to ensure the tab counts match the appointment data when the GAE filter is selected. The logic already exists in `fetchAppointments` - it just needs to be replicated in `fetchTabCounts`.
