

# Fix: Rescheduled Appointments Must Reset Status and Bucket

## Root Cause

In `supabase/functions/ghl-webhook-handler/index.ts`, the `getUpdateableFields` function (line 594-605) detects rescheduling when the appointment date changes and resets `internal_process_complete = false`. However, it explicitly **skips resetting the status** when the current status is a terminal one (Cancelled, No Show, Showed, OON):

```
if (!['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon'].includes(currentStatus)) {
  updateFields.status = 'Confirmed'
}
```

This means a Cancelled appointment that gets rescheduled keeps its "Cancelled" status and never returns to the "New" bucket.

## The Fix

Invert the logic: when a reschedule is detected (date changed), **always** reset the status to "Confirmed" and `internal_process_complete` to `false`, regardless of the previous status. A reschedule is a clear signal that the patient is re-engaged and the appointment needs fresh processing.

Additionally, the explicit status update logic later (lines 620-623) also fires because GHL sends "confirmed" as an explicit status. But it runs **after** the reschedule block and could be overwritten. To be safe, the reschedule block should unconditionally set `status = 'Confirmed'`.

## Changes

### 1. `supabase/functions/ghl-webhook-handler/index.ts`

In the `getUpdateableFields` function, replace the conditional status reset with an unconditional one when a date change (reschedule) is detected:

**Before (lines 597-605):**
```typescript
// Reset IPC and status if date actually changed (reschedule detected)
if (existingAppointment.date_of_appointment !== webhookData.date_of_appointment) {
  updateFields.internal_process_complete = false
  // Reset status to Confirmed unless it's a terminal status
  const currentStatus = existingAppointment.status?.toLowerCase()?.trim() || ''
  if (!['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon'].includes(currentStatus)) {
    updateFields.status = 'Confirmed'
  }
}
```

**After:**
```typescript
// Reset IPC and status if date actually changed (reschedule detected)
if (existingAppointment.date_of_appointment !== webhookData.date_of_appointment) {
  updateFields.internal_process_complete = false
  updateFields.status = 'Confirmed'
  updateFields.was_ever_confirmed = true
}
```

This ensures:
- Status is always reset to "Confirmed" on reschedule (even from Cancelled, No Show, etc.)
- `internal_process_complete` is set to `false`, routing the appointment back to the "New" tab
- `was_ever_confirmed` is set to `true` since the rescheduled appointment is now confirmed

### 2. No frontend changes needed

The existing tab routing logic already handles this correctly:
- `internal_process_complete = false` routes to "New" tab
- Status "Confirmed" displays the correct badge

## Testing

After deploying, the fix can be verified by checking that any future GHL webhook with a changed `date_of_appointment` for an existing cancelled appointment resets both `status` and `internal_process_complete`.

