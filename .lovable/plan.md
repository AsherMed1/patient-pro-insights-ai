

## Fix: GHL Webhook Echo Overwrites OON/Do Not Call Status

### Problem
When a user sets an appointment to "OON" in the portal:
1. Portal saves status as "OON" in the database
2. Portal syncs to GHL, which maps OON → `cancelled` (GHL has no "OON" status)
3. GHL fires a webhook back with `appointmentStatus: "cancelled"`
4. The webhook handler sees "cancelled" as an explicit status change (line 664) and **overwrites OON with "Cancelled"**

The same issue affects "Do Not Call" status, which also maps to `cancelled` in GHL.

The reschedule note is a secondary symptom — GHL's webhook likely includes the appointment date, and because the handler processes date changes before status, it may detect a spurious date difference and trigger reschedule logic.

### Fix

**File: `supabase/functions/ghl-webhook-handler/index.ts`**

1. **Guard against echo-back overwrites** (~line 662-666): Before applying an incoming status, check if the existing appointment already has a portal-only terminal status (`OON`, `Do Not Call`). If the incoming GHL status is `cancelled` and the existing status is one of these, skip the status update — it's just GHL echoing back the portal's own sync.

   ```typescript
   // Conditionally update status (only for explicit changes)
   const incomingStatus = webhookData.status?.toLowerCase()
   if (isExplicitStatusChange(incomingStatus)) {
     // Guard: Don't let GHL's "cancelled" echo overwrite portal-only statuses
     const existingStatus = existingAppointment.status?.toLowerCase()
     const portalOnlyStatuses = ['oon', 'do not call']
     const isEchoBack = (incomingStatus === 'cancelled' || incomingStatus === 'canceled') 
                         && portalOnlyStatuses.includes(existingStatus)
     if (!isEchoBack) {
       updateFields.status = webhookData.status
     } else {
       console.log(`[WEBHOOK] Skipping status echo-back: existing="${existingAppointment.status}", incoming="${webhookData.status}"`)
     }
   }
   ```

2. **Guard reschedule logic against echo-back** (~line 611-648): Similarly, when the existing status is a portal-only terminal status and the incoming GHL data includes a date, skip the reschedule reset logic. The date in the webhook is just GHL confirming what it knows — not a real reschedule.

   Add a check: if `existingStatus` is `OON` or `Do Not Call`, skip the reschedule block (don't reset status to Confirmed, don't reset IPC, don't add reschedule history).

