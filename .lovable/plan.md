

## Fix: Prevent GHL Webhooks from Reconfirming Cancelled Appointments

### Root Cause
In `ghl-webhook-handler/index.ts` (line 689), the "portal-only terminal statuses" list that is protected from GHL overwrites only includes `oon`, `do not call`, and `welcome call`. The `cancelled` status is NOT protected, so when GHL sends a "confirmed" webhook (triggered by insurance upload or other contact activity), it overwrites the cancellation.

Additionally, if the appointment were deleted entirely, the webhook would simply re-create it as a new "Confirmed" appointment — so deletion doesn't solve the problem either.

### Fix (1 file, 2 changes)

**File: `supabase/functions/ghl-webhook-handler/index.ts`**

**Change 1 — Protect cancelled status from GHL overwrites (line 689)**
Add `cancelled` and `canceled` to the portal-only terminal statuses list:
```typescript
const portalOnlyStatuses = ['oon', 'do not call', 'welcome call', 'cancelled', 'canceled']
```
This prevents any GHL webhook from changing a cancelled appointment back to confirmed.

**Change 2 — Same protection in the reschedule guard (line 631)**
Add `cancelled` and `canceled` to the reschedule guard list so GHL can't reschedule a cancelled appointment either:
```typescript
const portalOnlyTerminalStatuses = ['oon', 'do not call', 'welcome call', 'cancelled', 'canceled']
```

### What this means operationally
- Once you cancel an appointment in the portal, **no GHL webhook** (insurance upload, status change, reschedule) can reconfirm it
- The lead remains fully active in GHL — all workflows, follow-ups, and reschedule sequences continue unaffected
- If the lead needs to be rescheduled, the team creates a new appointment in GHL, which creates a fresh record in the portal
- No database changes needed — this is a single edge function update

### Summary
| What | Detail |
|------|--------|
| Problem | Insurance uploads trigger GHL webhook that overwrites "Cancelled" → "Confirmed" |
| Fix | Add `cancelled` to the protected status list (2 locations in webhook handler) |
| Impact on leads | None — GHL workflows are unaffected |
| Deletion needed? | No — protection is the better approach |

