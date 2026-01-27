

## Exclude Reserved Time Blocks from Appointment Management

### Problem

Reserved time blocks (created to prevent overbooking) are appearing as regular appointment cards in the Appointment Management view. This causes confusion because:
- They show "Pending EMR" and "DOB Missing" badges
- They appear in the "New" and other tabs
- They have patient-facing fields that don't apply to reserved blocks

### Solution

Add a filter to exclude reserved time blocks (`is_reserved_block = true`) from all queries in the Appointment Management component. Reserved blocks should only be visible in the Calendar View.

---

### Part 1: Update Main Appointments Query

**File:** `src/components/AllAppointmentsManager.tsx`

Add filter to the count query and data query:

```typescript
// In fetchAppointments function - add after initial query setup

// Exclude reserved time blocks from appointment management
countQuery = countQuery.or('is_reserved_block.is.null,is_reserved_block.eq.false');

// ... later for the data query ...
appointmentsQuery = appointmentsQuery.or('is_reserved_block.is.null,is_reserved_block.eq.false');
```

---

### Part 2: Update Tab Counts Query

**File:** `src/components/AllAppointmentsManager.tsx`

Add filter to the base query function used for tab counts:

```typescript
// In fetchTabCounts function - update getBaseQuery
const getBaseQuery = () => {
  let query = supabase
    .from('all_appointments')
    .select('*', { count: 'exact', head: true });
    
  // Exclude reserved time blocks
  query = query.or('is_reserved_block.is.null,is_reserved_block.eq.false');
  
  // ... rest of filters ...
  return query;
};
```

---

### Part 3: Also Update Edge Function for Reserved Blocks

**File:** `supabase/functions/create-ghl-appointment/index.ts`

Set `internal_process_complete = true` for reserved blocks so they don't appear in the "New" tab even if the exclusion filter isn't applied:

```typescript
// When creating local record, mark process as complete
await supabase.from('all_appointments').insert({
  // ... other fields ...
  is_reserved_block: true,
  internal_process_complete: true,  // Add this line
});
```

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | Add `is_reserved_block` filter to count query, data query, and tab counts base query |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Set `internal_process_complete: true` when creating reserved blocks |

---

### Result

After these changes:
- Reserved time blocks will NOT appear in any Appointment Management tabs (All, New, Upcoming, etc.)
- Reserved blocks will ONLY be visible in the Calendar View
- Calendar View correctly shows reserved blocks with the gray/hatched styling
- Tab counts will not include reserved blocks

