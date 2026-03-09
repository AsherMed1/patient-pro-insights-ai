

## Fix: Reschedule Echo-Back Loop Between Portal and GHL

### Problem
When a user reschedules an appointment on the portal (e.g., Mar 16 → Mar 13), the portal syncs this to GHL via `update-ghl-appointment`. GHL then fires a webhook back to `ghl-webhook-handler`, which sees the date change and processes it as a *new* reschedule — often with stale data that reverts the appointment back to the old date (Mar 13 → Mar 16). This creates an infinite back-and-forth loop.

The screenshot confirms this pattern: the portal reschedules, GHL echoes back, and the appointment keeps flipping between dates.

### Solution: Reschedule Debounce Guard

Add a time-based debounce in the webhook handler's `getUpdateableFields` function. If the existing appointment's `updated_at` is within the last **120 seconds**, skip date/time changes from the GHL webhook. This prevents echo-backs while still allowing legitimate GHL-originated reschedules (which wouldn't overlap with a recent portal update).

### Changes

**File: `supabase/functions/ghl-webhook-handler/index.ts`** — in `getUpdateableFields` (~line 613)

Before the existing reschedule detection block, add a debounce check:

```typescript
// Echo-back guard: skip date/time changes if appointment was updated by portal very recently
const updatedAt = existingAppointment.updated_at ? new Date(existingAppointment.updated_at) : null;
const now = new Date();
const secondsSinceUpdate = updatedAt ? (now.getTime() - updatedAt.getTime()) / 1000 : Infinity;

if (secondsSinceUpdate < 120) {
  console.log(`[WEBHOOK] Skipping date/time update — appointment updated ${Math.round(secondsSinceUpdate)}s ago (debounce guard)`);
  // Still allow non-date fields to update, just skip date_of_appointment and requested_time
} else {
  // existing date/time update + reschedule logic goes here
}
```

This wraps the existing date/time processing (lines ~614-662) in the else branch, so webhooks arriving within 2 minutes of a portal update won't touch date/time fields.

**Deploy**: `ghl-webhook-handler` edge function.

### Immediate Fix for Dennis Murphy
After deploying, manually correct Dennis Murphy's appointment in the portal to Mar 13, 2026 at 1:45 PM (EDT). The debounce guard will prevent GHL's echo from reverting it.

