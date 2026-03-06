

## Fix Short-Notice Alert: Timezone, Hours Calculation, and GHL Link

Three bugs identified from the John Karas alert screenshot:

### Bug 1: Wrong appointment time and hours calculation
`date_of_appointment` stores `2026-03-06` and `requested_time` stores `13:00` (1 PM CST). The code does `new Date('2026-03-06T13:00')` which Deno interprets as **UTC**, not Central Time. This makes the appointment appear as 8:00 AM ET in the Slack alert (13:00 UTC = 8:00 AM ET) and miscalculates the hours difference as 13h instead of ~23 minutes.

**Fix**: Treat the concatenated datetime as Central Time by adding 5 or 6 hours offset (CST/CDT). Better approach: look up the project's `timezone` column and use it, or default to `America/Chicago`. Apply this to all three `checkShortNoticeAlert` functions.

**Files**: `ghl-webhook-handler/index.ts`, `all-appointments-api/index.ts`, `update-appointment-fields/index.ts`

### Bug 2: Wrong GHL contact link
The alert generates `https://app.gohighlevel.com/contacts/detail/{ghlId}` but the correct v2 format (used everywhere else in the app) is `https://app.gohighlevel.com/v2/location/{locationId}/contacts/detail/{ghlId}`.

**Fix**: Fetch `ghl_location_id` from the `projects` table (already queried for threshold) and include it in the payload. Update `notify-slack-short-notice` to use the v2 URL format.

**Files**: `notify-slack-short-notice/index.ts`, all three caller functions

### Bug 3: Display timezone should be Central, not Eastern
The Slack alert formats the appointment time in `America/New_York` (ET). Most clinics are in Central Time. Use the project's configured timezone instead.

**Fix**: Pass the project timezone in the payload and use it for formatting in the Slack message.

**Files**: `notify-slack-short-notice/index.ts`, all three caller functions

### Changes Summary

| File | Change |
|------|--------|
| `ghl-webhook-handler/index.ts` | Fix timezone conversion for apptTime; pass `ghlLocationId` and `timezone` in payload |
| `all-appointments-api/index.ts` | Same timezone fix and payload additions |
| `update-appointment-fields/index.ts` | Same timezone fix and payload additions |
| `notify-slack-short-notice/index.ts` | Use v2 GHL link with locationId; format time in project timezone instead of ET |

