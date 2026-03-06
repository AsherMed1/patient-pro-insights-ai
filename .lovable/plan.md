

## Exclude Weekends from Short-Notice Countdown

Yes — we can add a helper function that calculates **business hours only** (skipping Saturday and Sunday) between the creation time and appointment time, then use that instead of raw clock hours for the threshold comparison.

### How it works

A new `calculateBusinessHours(startUTC, endUTC)` function will:
1. Walk hour-by-hour from creation time to appointment time
2. Skip any hour that falls on a Saturday or Sunday (in UTC, which is close enough for US business logic)
3. Return the count of weekday hours only

**Example**: Appointment booked Friday 5 PM for Monday 9 AM:
- Clock hours: ~64h
- Business hours (weekend-excluded): ~16h (Friday 5 PM → midnight = 7h, Monday midnight → 9 AM = 9h)

This function replaces the simple `(apptTime - createdTime) / 3600000` calculation in `checkShortNoticeAlert` across all three edge functions.

### Files to update

| File | Change |
|------|--------|
| `all-appointments-api/index.ts` | Add `calculateBusinessHours()`, use it in `checkShortNoticeAlert` |
| `ghl-webhook-handler/index.ts` | Same |
| `update-appointment-fields/index.ts` | Same |
| `notify-slack-short-notice/index.ts` | Update Slack message to say "business hours" in the notice text |

### Detail

The `hoursDiff` line changes from:
```typescript
const hoursDiff = (apptTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
```
to:
```typescript
const hoursDiff = calculateBusinessHours(createdTime, apptTime);
```

The `calculateBusinessHours` function counts full hours between two dates, skipping any hour where the midpoint falls on Saturday (day 6) or Sunday (day 0) in the project's local timezone. This ensures a Friday-to-Monday booking only counts ~16 hours instead of ~64.

The Slack alert text and `hours_difference` logged to `short_notice_alerts` will reflect business hours, making thresholds more meaningful for weekday clinic operations.

