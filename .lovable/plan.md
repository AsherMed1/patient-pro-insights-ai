

## Investigation: OON Portal Status Not Triggering GHL Cancellation

### Root Cause

The OON Slack notification and GHL status sync are both **client-side only** — they run sequentially in the browser after the database update. The execution chain in `AllAppointmentsManager.tsx` (lines 698-848) is:

```text
1. DB update (status → OON)           ✅ always works
2. Insert status change note           ← awaited
3. OON Slack notification              ← awaited (try/catch)
4. appointment-status-webhook          ← awaited, 30s timeout
5. GHL status sync                     ← awaited (THE PROBLEM)
```

Step 4 (the appointment-status-webhook) calls the project's external webhook URL with a **30-second timeout**. If that endpoint is slow or unresponsive, the browser may:
- Time out waiting
- The user may navigate away before step 5 executes
- The page may re-render or lose context

Since each step is `await`ed sequentially, any delay or failure in steps 2-4 can prevent the GHL sync (step 5) from ever executing — even though the local DB update succeeded.

### Fix: Move GHL Sync Before External Webhook

Reorder the operations so the GHL sync happens **immediately after** the Slack notification (both are critical), and the external webhook (which is non-critical and can be slow) runs last:

**File: `src/components/AllAppointmentsManager.tsx`**

Current order (lines 698-848):
1. Status change note
2. Do Not Call / DND logic
3. OON Slack notification
4. External webhook (30s timeout) ← blocks GHL sync
5. GHL sync

New order:
1. Status change note
2. Do Not Call / DND logic
3. OON Slack notification
4. **GHL sync** ← moved up, runs before external webhook
5. External webhook (non-critical, fire-and-forget)

Additionally, make the external webhook call **non-blocking** (fire-and-forget) so it never blocks the rest of the flow:

```typescript
// Fire-and-forget: don't await the external webhook
supabase.functions.invoke('appointment-status-webhook', {
  body: { appointment_id: appointmentId, old_status: oldStatus, new_status: status }
}).catch(err => console.error('⚠️ Webhook failed (non-critical):', err));
```

### Files to Edit
- `src/components/AllAppointmentsManager.tsx` — reorder GHL sync before webhook, make webhook fire-and-forget

