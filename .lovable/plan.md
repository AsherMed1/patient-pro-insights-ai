

## Fix: OON (and other statuses) Not Cancelling in GHL

### Root Cause

The GHL sync block (lines 794-831) is **still inside** the `if (oldStatus !== status)` conditional (line 698). This means:

1. If the status was already set to "OON" by a database trigger or tag before the user interacted with the dropdown, `oldStatus` equals `status`, so the GHL sync is **completely skipped**.
2. The edge function logs confirm no OON sync calls were made for Guillermo Dando / Arterial Interventional Centers — the function was never invoked.

### Fix

Move the GHL sync block (lines 794-831) **outside** the `if (oldStatus !== status)` guard so it runs on every status save, regardless of whether the status changed. The status note, DND logic, Slack notifications, and webhook should remain gated by the change check since those are one-time side effects.

**File: `src/components/AllAppointmentsManager.tsx`**

```text
Current structure (line 698):
  if (oldStatus !== status) {
    status note
    DND logic
    OON Slack
    GHL sync        ← STUCK INSIDE, skipped when status unchanged
    webhook
  }

Proposed structure:
  GHL sync          ← ALWAYS runs after DB update succeeds
  if (oldStatus !== status) {
    status note
    DND logic
    OON Slack
    webhook (fire-and-forget)
  }
```

This is a single-file change — extract lines 794-844 and move them before line 698.

