

## Fix: "Welcome Call" Status Being Overwritten by GHL Webhook

### Root Cause

"Welcome Call" is a **portal-only status** — it has no equivalent in GoHighLevel. When staff sets an appointment to "Welcome Call" in the portal:

1. The portal saves "Welcome Call" to the database
2. The portal does NOT sync this to GHL (because `STATUS_MAP` in `update-ghl-appointment` has no mapping for "Welcome Call")
3. GHL still considers the appointment "confirmed"
4. When GHL sends any subsequent webhook for this contact (activity, field update, etc.), the `ghl-webhook-handler` sees `status: "confirmed"` and overwrites "Welcome Call" back to "Confirmed"

The echo-back guard on line 687 of `ghl-webhook-handler/index.ts` only protects `['oon', 'do not call']` — it does not protect "Welcome Call".

The same gap exists in `update-appointment-status/index.ts` (line 216).

### Fix

**Add "welcome call" to the portal-only protected statuses list** in both edge functions:

**1. `supabase/functions/ghl-webhook-handler/index.ts` (line 687)**
```typescript
const portalOnlyStatuses = ['oon', 'do not call', 'welcome call']
```

**2. `supabase/functions/update-appointment-status/index.ts` (line 216)**
```typescript
const portalOnlyStatuses = ['oon', 'do not call', 'welcome call']
```

**3. `supabase/functions/ghl-webhook-handler/index.ts` (line 629)** — also protect "Welcome Call" from reschedule-triggered status resets:
```typescript
const portalOnlyTerminalStatuses = ['oon', 'do not call', 'welcome call']
```

### Why This Is Safe
- "Welcome Call" is a workflow status that only exists in the portal
- GHL never sends "welcome call" as a status, so this guard only prevents GHL's "confirmed" from overwriting it
- If a genuine status change happens in GHL (e.g., cancelled, no show), the `isExplicitStatusChange` check determines whether to apply it — but the guard ensures portal-only statuses are preserved

### Files to Edit
- `supabase/functions/ghl-webhook-handler/index.ts` — 2 lines
- `supabase/functions/update-appointment-status/index.ts` — 1 line

Both functions need redeployment after the edit.

