

# Plan: Configure Dedicated Slack Webhook for #calendar-updates

## Overview

Update the calendar notification system to use a dedicated webhook for `#calendar-updates` channel instead of the general Slack webhook.

---

## Changes Required

### 1. Add New Supabase Secret

| Secret Name | Value |
|-------------|-------|
| `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` | `https://hooks.slack.com/services/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` |

### 2. Update Edge Function

**File:** `supabase/functions/notify-calendar-update/index.ts`

Change line 38 from:
```typescript
const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
```

To:
```typescript
const webhookUrl = Deno.env.get('SLACK_CALENDAR_UPDATES_WEBHOOK_URL');
```

Also update the error message on line 40:
```typescript
console.error('[notify-calendar-update] SLACK_CALENDAR_UPDATES_WEBHOOK_URL not configured');
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/notify-calendar-update/index.ts` | Update environment variable name from `SLACK_WEBHOOK_URL` to `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` |
| Supabase Secrets | Add `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` with the provided webhook URL |

---

## Expected Result

- Calendar block notifications will go directly to `#calendar-updates` channel
- The general `SLACK_WEBHOOK_URL` remains unchanged for other notifications (like support requests)
- Clear separation of notification types to appropriate channels

