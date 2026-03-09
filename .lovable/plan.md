

## Fix: OON Status Being Overwritten by GHL Webhook Echo

### Problem
When a patient is marked OON on the portal, the system:
1. Updates the DB to "OON"
2. Fires `appointment-status-webhook` to a GHL workflow URL
3. Sends "cancelled" to GHL via `update-ghl-appointment`

The existing echo-back guard in `ghl-webhook-handler` only blocks incoming **"cancelled"** status from overwriting OON/Do Not Call. But GHL workflows can fire back webhooks with **any** status (e.g., "confirmed", "booked") before the cancellation even reaches GHL. These bypass the guard and overwrite OON.

### Solution
Broaden the echo-back guard: if the existing DB status is a portal-only terminal status (OON, Do Not Call), skip **all** incoming status updates from GHL webhooks — not just "cancelled."

### Changes

**File: `supabase/functions/ghl-webhook-handler/index.ts`** (~lines 682-694)

Replace the current guard:
```typescript
if (!isEchoBack) {
  updateFields.status = webhookData.status
} else {
  console.log(`[WEBHOOK] Skipping status echo-back: ...`)
}
```

With a broader guard:
```typescript
const portalOnlyStatuses = ['oon', 'do not call']
const isPortalOnlyTerminal = portalOnlyStatuses.includes(existingStatusForEcho)

if (isPortalOnlyTerminal) {
  console.log(`[WEBHOOK] Preserving portal-only terminal status "${existingAppointment.status}" — ignoring incoming "${webhookData.status}"`)
} else {
  updateFields.status = webhookData.status
}
```

This ensures that once a patient is marked OON or Do Not Call on the portal, no GHL webhook — regardless of what status it carries — can overwrite it. One file, one block changed.

**Deploy**: `ghl-webhook-handler` edge function.

