

# Plan: Add Slack Notification for Reserved Time Blocks to #calendar-updates

## Problem Summary

When clinics reserve time blocks (especially full-day blocks), the PPM team has no visibility. This impacts the cheatsheet updates and team awareness of clinic availability changes.

## Solution

Create a new edge function to send notifications to `#calendar-updates` when time blocks are reserved, and call it from the `ReserveTimeBlockDialog` after successful block creation.

---

## Technical Changes

### 1. Add New Secret: `SLACK_CALENDAR_UPDATES_WEBHOOK_URL`

You'll need to create a new Slack webhook specifically for the `#calendar-updates` channel:
1. Go to https://api.slack.com/apps → Select your Slack app
2. Navigate to "Incoming Webhooks"
3. Add a new webhook pointed to `#calendar-updates`
4. Save the URL as a new Supabase secret

### 2. Create New Edge Function: `supabase/functions/notify-calendar-update/index.ts`

A new edge function that sends rich notifications when reserved time blocks are created:

```typescript
interface CalendarUpdatePayload {
  projectName: string;
  calendarName: string;
  date: string;           // e.g., "January 30, 2026"
  timeRanges: string[];   // e.g., ["9:00 AM - 5:00 PM", "6:00 PM - 8:00 PM"]
  reason?: string;
  blockedBy: string;      // User who created the block
  isFullDay: boolean;     // True if blocking 8+ hours
}
```

**Slack Message Format:**
```text
+------------------------------------------+
| 📅 Calendar Update: Reserved Time Block  |
+------------------------------------------+
| Clinic: Premier Vascular                 |
| Calendar: GAE - Dr. Smith                |
| Date: January 30, 2026                   |
| Blocked: 9:00 AM - 5:00 PM (FULL DAY)    |
| Reason: Provider vacation                |
| By: Jane at Clinic                       |
+------------------------------------------+
| ⚠️ Action: Update cheatsheet             |
+------------------------------------------+
```

### 3. Update `ReserveTimeBlockDialog.tsx`

After successful block creation (around line 376), add a call to send the notification:

```typescript
// After successful creation, notify Slack
const totalMinutesBlocked = timeRanges.reduce((sum, range) => {
  const [startH, startM] = range.startTime.split(':').map(Number);
  const [endH, endM] = range.endTime.split(':').map(Number);
  return sum + ((endH * 60 + endM) - (startH * 60 + startM));
}, 0);

const isFullDay = totalMinutesBlocked >= 480; // 8 hours = full day

await supabase.functions.invoke('notify-calendar-update', {
  body: {
    projectName,
    calendarName: selectedCalendar?.name,
    date: format(selectedDate, 'PPPP'),
    timeRanges: timeRanges.map(r => `${formatTime(r.startTime)} - ${formatTime(r.endTime)}`),
    reason: reason || 'Not specified',
    blockedBy: userName || 'Portal User',
    isFullDay,
  }
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/notify-calendar-update/index.ts` | **Create** - New edge function for Slack notifications |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | **Modify** - Add notification call after successful block creation |
| Supabase Secrets | **Add** - `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` for the #calendar-updates channel |

---

## Notification Triggers

The notification will fire when:
- Any time block is reserved via the portal
- Includes all relevant details (clinic, calendar, date, times, reason, who)
- **Special emphasis** (⚠️ icon + "FULL DAY" tag) when 8+ hours are blocked

---

## Secret Setup Required

Before implementation, you need to create the Slack webhook:

1. Open https://api.slack.com/apps
2. Select or create a Slack app for your workspace
3. Go to "Incoming Webhooks" → Enable
4. Click "Add New Webhook to Workspace"
5. Choose `#calendar-updates` channel
6. Copy the webhook URL
7. Add it to Supabase secrets as `SLACK_CALENDAR_UPDATES_WEBHOOK_URL`

---

## Expected Outcome

After implementation:
- Every reserved time block triggers a Slack notification to `#calendar-updates`
- Full-day blocks are highlighted for immediate attention
- Team can update cheatsheet proactively when clinics modify availability
- Notifications include who blocked and why for context

