
# Plan: Use Dedicated Slack Channel for OON Notifications

## Overview

Configure the OON notification edge function to use a dedicated Slack webhook URL, allowing notifications to go to a separate channel from support requests.

---

## Implementation Steps

### Step 1: Add New Secret

Create a new secret `SLACK_OON_WEBHOOK_URL` to store the webhook URL for your OON notifications channel.

**You'll need to:**
1. Create an incoming webhook in Slack for your desired channel
2. Copy the webhook URL (format: `https://hooks.slack.com/services/T.../B.../...`)

---

### Step 2: Update Edge Function

Modify `supabase/functions/notify-slack-oon/index.ts` to use the new secret:

**Change from:**
```typescript
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');
if (!SLACK_WEBHOOK_URL) {
  console.error('[notify-slack-oon] SLACK_WEBHOOK_URL not configured');
  throw new Error('SLACK_WEBHOOK_URL not configured');
}
```

**Change to:**
```typescript
const SLACK_OON_WEBHOOK_URL = Deno.env.get('SLACK_OON_WEBHOOK_URL');
if (!SLACK_OON_WEBHOOK_URL) {
  console.error('[notify-slack-oon] SLACK_OON_WEBHOOK_URL not configured');
  throw new Error('SLACK_OON_WEBHOOK_URL not configured');
}
```

Also update the fetch call to use the new variable name.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/notify-slack-oon/index.ts` | Use `SLACK_OON_WEBHOOK_URL` instead of `SLACK_WEBHOOK_URL` |

---

## Setup Required

Before or after implementation, you'll need to provide the Slack webhook URL for your OON channel. The webhook can be created from:
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your workspace app (or create one)
3. Go to "Incoming Webhooks" and create a new webhook for your OON channel
4. Copy the webhook URL

---

## Technical Notes

- This follows the same pattern as `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` for calendar notifications
- The existing `SLACK_WEBHOOK_URL` remains unchanged for support notifications
- No changes needed to the frontend - only the edge function secret reference changes
