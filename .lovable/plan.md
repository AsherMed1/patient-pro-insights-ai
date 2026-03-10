

## Add "Do Not Call" to Short-Notice Alert Exclusions

### Problem
Appointments marked "Do Not Call" can still trigger short-notice Slack alerts because "do not call" is not in the `terminal` status list inside `checkShortNoticeAlert`.

### Changes

Add `'do not call'` to the `terminal` array in `checkShortNoticeAlert` in **3 files**:

1. **`supabase/functions/ghl-webhook-handler/index.ts`** (line 1250)
2. **`supabase/functions/all-appointments-api/index.ts`** (line 427)
3. **`supabase/functions/update-appointment-fields/index.ts`** (line 237)

In each file, change:
```typescript
const terminal = ['cancelled', 'canceled', 'no show', 'showed', 'oon'];
```
to:
```typescript
const terminal = ['cancelled', 'canceled', 'no show', 'showed', 'oon', 'do not call'];
```

All three edge functions will need redeployment.

