

## Fix: Stop Full Page Reload After Saving Appointment Details

### Root Cause

**Line 1678 in `AppointmentCard.tsx`:**
```typescript
onDataRefresh={() => window.location.reload()}
```

When a user opens the detailed appointment view from the **All Appointments list** and saves any field (contact info, insurance, PCP, status, etc.), the `onDataRefresh` callback fires `window.location.reload()`. This does a full browser reload, which:
1. Destroys all React state (filters, search, scroll position, selected tab)
2. Navigates the user back to the default portal view
3. Closes the detail modal they were working in

In contrast, the **calendar view** path in `ProjectPortal.tsx` (line 683) correctly uses `setCalendarRefreshKey(prev => prev + 1)` -- no full reload.

### Fix

Replace `window.location.reload()` with a targeted data refetch. The `AppointmentCard` is rendered by `AllAppointmentsManager`, which has a `fetchAppointments()` function that reloads just the appointment data. We need to:

1. **Add an `onDataRefresh` prop** to `AppointmentCard` that `AllAppointmentsManager` can pass down
2. **In `AllAppointmentsManager`**, pass `fetchAppointments` as the refresh callback
3. **In `AppointmentCard`**, use that callback instead of `window.location.reload()`

### Files to Change

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` | Replace `window.location.reload()` with the parent-provided refresh callback. Add `onDataRefresh` to the props interface. |
| `src/components/AllAppointmentsManager.tsx` | Pass `fetchAppointments` as `onDataRefresh` to each `AppointmentCard` |

### Technical Detail

**`AppointmentCard.tsx`** -- Add prop and use it:
```typescript
// In AppointmentCardProps interface, add:
onDataRefresh?: () => void;

// Line 1678, change from:
onDataRefresh={() => window.location.reload()}
// to:
onDataRefresh={() => {
  onDataRefresh?.();
}}
```

If no `onDataRefresh` prop is provided (defensive), it simply does nothing (the toast already confirms the save succeeded, and local state in `ParsedIntakeInfo` already reflects the edit).

**`AllAppointmentsManager.tsx`** -- Pass the callback:
```typescript
<AppointmentCard
  // ...existing props
  onDataRefresh={() => {
    fetchAppointments();
    fetchTabCounts();
  }}
/>
```

This ensures that after saving inside the detail view:
- The appointment list refreshes with fresh data
- Tab counts update
- The detail modal stays open
- Filters, search, scroll position are all preserved
- No full page reload occurs

