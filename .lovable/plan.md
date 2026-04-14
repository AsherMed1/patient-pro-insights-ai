

## Fix: Multiple GHL Appointments Per Contact Overwriting Each Other

### Root Cause

The `findExistingAppointment` function in `ghl-webhook-handler/index.ts` has a problematic fallback:

1. **First lookup**: Match by `ghl_appointment_id` (unique per GHL appointment) — correct
2. **Fallback**: Match by `ghl_id` (contact ID) — returns the **oldest** record regardless of which GHL appointment the webhook is about

When a contact like Donna Finn has 3 separate GHL appointments (each with a unique `ghl_appointment_id`), here's what happens:

- **Webhook 1** (Appointment A, confirmed): No match found → creates portal record with `ghl_appointment_id = A`
- **Webhook 2** (Appointment B, cancelled): No match by `ghl_appointment_id = B` → falls back to `ghl_id` → finds the portal record from step 1 → **overwrites it with cancelled status**
- **Webhook 3** (Appointment C, cancelled): Same fallback → same portal record → already cancelled

The confirmed appointment gets cancelled because the `ghl_id` fallback doesn't distinguish between different appointments for the same contact.

### Fix (1 file, 1 change)

**File: `supabase/functions/ghl-webhook-handler/index.ts`**

**Change the `findExistingAppointment` function (lines 834-889)**:

When a `ghl_appointment_id` is provided but not found in the database, the function should **not** fall back to `ghl_id` matching. The `ghl_id` fallback should only be used when `ghl_appointment_id` is `null` or empty (i.e., the webhook didn't provide one).

Current logic:
```
1. Try ghl_appointment_id → not found
2. Try ghl_id + name → found oldest record → WRONG MATCH
3. Try ghl_id only → found oldest record → WRONG MATCH
```

Fixed logic:
```
1. Try ghl_appointment_id → not found
2. IF ghl_appointment_id was provided, STOP here (this is a different appointment)
3. Only fall back to ghl_id matching if no ghl_appointment_id was provided
```

This means:
- If GHL sends a webhook with appointment ID "B" but only appointment "A" exists in the portal, it will be treated as a **new appointment** (and skipped if it has a terminal status like "cancelled")
- The existing confirmed appointment "A" is never touched by webhooks for appointment "B" or "C"

### Impact
- Prevents cross-contamination between multiple appointments for the same contact
- Terminal status guard (already in place) will skip creating new cancelled appointments
- No database changes needed — single edge function update
- Existing single-appointment contacts are unaffected (their `ghl_appointment_id` will match directly)

