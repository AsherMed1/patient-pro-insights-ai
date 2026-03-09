

## Fix: Preserve Original Appointment Duration on Reschedule

**Problem**: When rescheduling, `update-ghl-appointment` hardcodes `addMinutes(start, 30)` for the new end time. Clinics like AVA Vascular use 20-minute slots, so their appointments get incorrectly stretched to 30 minutes in GHL.

**Fix**: In `supabase/functions/update-ghl-appointment/index.ts`, calculate the original duration from the existing appointment's `startTime` and `endTime`, then apply that same duration to the new start time.

```
// Before (line 224):
const endDateTimeInTz = addMinutes(startDateTimeInTz, 30);

// After:
const originalDuration = existingEndTime && existingStartTime
  ? Math.round((new Date(existingEndTime).getTime() - new Date(existingStartTime).getTime()) / 60000)
  : 30; // fallback to 30 only if no existing times
const endDateTimeInTz = addMinutes(startDateTimeInTz, originalDuration);
```

**Files**: `supabase/functions/update-ghl-appointment/index.ts` — one change, lines 224-226.

