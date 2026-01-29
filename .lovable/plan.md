
# Plan: Add Slack Notification for Reserved Time Blocks

## Overview

Implement automatic Slack notifications to alert the team when clinics reserve time blocks, using the existing `SLACK_WEBHOOK_URL` secret.

---

## Technical Changes

### 1. Create Edge Function: `supabase/functions/notify-calendar-update/index.ts`

New edge function that sends rich Slack notifications:

**Payload Structure:**
```typescript
interface CalendarUpdatePayload {
  projectName: string;      // e.g., "Premier Vascular"
  calendarName: string;     // e.g., "GAE - Dr. Smith"
  date: string;             // e.g., "Thursday, January 30th, 2026"
  timeRanges: string[];     // e.g., ["9:00 AM - 5:00 PM"]
  reason?: string;          // e.g., "Provider vacation"
  blockedBy: string;        // e.g., "Jane at Clinic"
  isFullDay: boolean;       // True if 8+ hours blocked
}
```

**Slack Message Format:**
- Header: "Calendar Update: Reserved Time Block"
- Fields: Clinic, Calendar, Date, Blocked By
- Time ranges with FULL DAY indicator if applicable
- Reason for the block
- Action context: "Please update the cheatsheet" for full-day blocks

### 2. Update `ReserveTimeBlockDialog.tsx`

After successful block creation (after the toast notification around line 376), add:

```typescript
// Calculate if this is a full day block (8+ hours)
const totalMinutesBlocked = timeRanges.reduce((sum, range) => {
  const [startH, startM] = range.startTime.split(':').map(Number);
  const [endH, endM] = range.endTime.split(':').map(Number);
  return sum + ((endH * 60 + endM) - (startH * 60 + startM));
}, 0);

const isFullDay = totalMinutesBlocked >= 480;

// Helper to format time for display
const formatTimeDisplay = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Send Slack notification (fire-and-forget, don't block on failure)
supabase.functions.invoke('notify-calendar-update', {
  body: {
    projectName,
    calendarName: selectedCalendar?.name || 'Unknown Calendar',
    date: format(selectedDate, 'PPPP'),
    timeRanges: createdAppointments.map(({ range }) => 
      `${formatTimeDisplay(range.startTime)} - ${formatTimeDisplay(range.endTime)}`
    ),
    reason: reason || 'Not specified',
    blockedBy: userName || 'Portal User',
    isFullDay,
  }
}).catch(err => {
  console.error('[ReserveTimeBlock] Failed to send Slack notification:', err);
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/notify-calendar-update/index.ts` | **Create** - New edge function |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | **Modify** - Add notification call |

---

## No Secret Changes Required

Using the existing `SLACK_WEBHOOK_URL` secret that's already configured.

---

## Expected Behavior

When a clinic user reserves a time block:
1. Block is created in GoHighLevel ✓
2. Local record is saved ✓  
3. **NEW:** Slack notification sent to configured channel
   - Shows clinic name, calendar, date, times
   - Highlights full-day blocks with warning
   - Includes reason and who created it
   - Prompts team to update cheatsheet

---

## Error Handling

- Notification failures are logged but don't block the reservation
- User still sees success toast even if Slack fails
- Edge function logs errors for debugging
