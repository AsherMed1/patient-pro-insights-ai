

# Plan: Fix Calendar Not Updating After Reserved Block Creation

## Problem Summary

User Susana in Ozark Regional Vein and Artery Center:
- Created a 4pm block that appears in GoHighLevel (GHL) 
- Sees an error in the portal ("Failed to Reserve Time")
- The portal calendar doesn't update to show the block

Investigation reveals:
1. The 4pm "TEST BLOCK" exists in GHL but NOT in the local database
2. The edge function was just updated with rollback logic - this block was likely created before that fix
3. The edge function now works correctly (tested and confirmed)

## Root Causes

### Issue 1: Stale Edge Function

The user may be running against a stale or cached version of the edge function. When the `create-ghl-appointment` function was updated earlier today, it may not have propagated to all clients immediately.

### Issue 2: Missing Immediate Refetch

Currently, when a reservation succeeds:
1. `onSuccess()` is called, incrementing `calendarRefreshKey`
2. The `CalendarDetailView` component remounts (via React key change)
3. The hook refetches data

However, this pattern has a potential race condition - if there's any latency between the database commit and the subsequent read, the new record might not appear.

### Issue 3: Orphaned GHL Block

The 4pm block exists in GHL but has no corresponding local record. This indicates either:
- Rollback failed (unlikely given the DELETE call is simple)
- Block was created before rollback logic was added
- The local insert failed after GHL succeeded, but before rollback logic existed

## Solution

### Part 1: Force Redeploy Edge Function

Redeploy the `create-ghl-appointment` edge function to ensure all users get the latest version with:
- Local record creation using service role key
- Rollback logic when local insert fails

### Part 2: Add Resilient Refetch After Success

Update `ReserveTimeBlockDialog.tsx` to:
1. Add a small delay (500ms) before calling `onSuccess()` to allow database propagation
2. This ensures the calendar refetch sees the newly inserted record

**Current Code:**
```typescript
onOpenChange(false);
onSuccess?.();
```

**Updated Code:**
```typescript
onOpenChange(false);
// Small delay to ensure database transaction is committed and visible
setTimeout(() => {
  onSuccess?.();
}, 500);
```

### Part 3: Clean Up Orphaned GHL Block (Manual)

The 4pm "TEST BLOCK" in GHL has no corresponding local record. Options:
1. Manually delete it from GHL
2. OR manually insert a matching record in the database

## Technical Details

### File: `src/components/appointments/ReserveTimeBlockDialog.tsx`

Add a small delay before calling onSuccess to ensure database consistency:

```typescript
// Around line 487-488
onOpenChange(false);
// Allow database transaction to fully propagate before triggering refetch
setTimeout(() => {
  onSuccess?.();
}, 500);
```

This accounts for any eventual consistency delays between write and read.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Add 500ms delay before `onSuccess()` call |

## Testing

1. Ask Susana to refresh her browser (clears any cached code)
2. Have her try creating a new reservation (e.g., 5pm)
3. Verify:
   - Success toast appears
   - Block appears in calendar view
   - Block appears in GHL
4. For the orphaned 4pm block: either delete from GHL or create matching DB record

## Summary

The core fix was already deployed (edge function now handles everything server-side). This additional change adds resilience against read-after-write timing issues by introducing a small delay before triggering the calendar refresh.

