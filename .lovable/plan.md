

# Map "OON" Status to Cancel in GoHighLevel

## Problem
When a user selects "OON" (Out of Network) as the appointment status, the system updates the local database but does NOT cancel the appointment in GoHighLevel. This is because the `update-ghl-appointment` edge function's `STATUS_MAP` only includes four statuses (Confirmed, Cancelled, No Show, Showed) and skips any unmapped status.

## Solution
Add `'OON': 'cancelled'` to the `STATUS_MAP` in the `update-ghl-appointment` edge function. This way, when OON is selected in the portal, the appointment will automatically be cancelled in GHL.

## Technical Change

**File: `supabase/functions/update-ghl-appointment/index.ts`** (line 13-17)

Update the STATUS_MAP to include OON:

```typescript
const STATUS_MAP: Record<string, string> = {
  'Confirmed': 'confirmed',
  'Cancelled': 'cancelled',
  'No Show': 'noshow',
  'Showed': 'showed',
  'OON': 'cancelled',        // OON cancels the appointment in GHL
  'Do Not Call': 'cancelled', // Also cancel DNC appointments in GHL
};
```

This also adds "Do Not Call" mapping to "cancelled" since it is another terminal status that should logically cancel the GHL appointment.

No frontend changes are needed -- the existing `AllAppointmentsManager.tsx` already sends the status to `update-ghl-appointment` for any GHL-linked appointment when the status changes.
