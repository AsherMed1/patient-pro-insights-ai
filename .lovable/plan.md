

# Plan: Simplify Slack Notification to Show Project Name

## Overview

Update the OON Slack notification to display "Project: {projectName}" instead of "Account Sheet name: {projectName} | Tracking Sheet {serviceType}".

---

## Changes

### File: `supabase/functions/notify-slack-oon/index.ts`

**Current (lines 85-91):**
```typescript
{
  type: "section",
  text: {
    type: "mrkdwn",
    text: `*Account Sheet name :*\n${accountSheetName}`
  }
}
```

**New:**
```typescript
{
  type: "section",
  text: {
    type: "mrkdwn",
    text: `*Project:*\n${projectName}`
  }
}
```

**Additional cleanup:**
- Remove the unused `extractServiceType` function (lines 17-25)
- Remove the unused `serviceType` and `accountSheetName` variables (lines 44-48)

---

## Summary

| File | Change |
|------|--------|
| `supabase/functions/notify-slack-oon/index.ts` | Replace "Account Sheet name" with "Project: {projectName}" and remove unused code |

