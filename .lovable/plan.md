

## Round-Robin Block Conflict Detection — Alert Only

You declined auto-cancellation (right call — auto-cancelling a real patient who's already been booked is risky). Here's a lighter-weight version: **detect and alert, never auto-cancel.** Setters/clinic decide what to do with each conflict.

### What this builds

When a new appointment lands in the portal (via GHL webhook or manual entry) on a date/time/calendar where a `is_reserved_block=true` record already exists, the system:

1. Flags the appointment with a new `booked_over_block = true` column
2. Posts a Slack alert to the existing `SLACK_CALENDAR_UPDATES_WEBHOOK_URL` channel
3. Adds an internal note on the appointment explaining the conflict
4. Shows a red `⚠ Booked over blocked time` badge on the appointment card

**No status change. No SMS. No GHL sync.** The patient stays Confirmed until a human acts.

### Files touched

| File | Change |
|---|---|
| DB migration | Add `all_appointments.booked_over_block boolean default false` |
| `src/utils/blockOverlapCheck.ts` (new) | Reusable function: given project + calendar + date + time, returns overlapping block records |
| `supabase/functions/ghl-webhook-handler/index.ts` | After insert, run overlap check; if hit → set flag, log note, fire Slack |
| `supabase/functions/notify-slack-block-conflict/index.ts` (new) | Lightweight Slack poster, mirrors `notify-slack-short-notice` |
| `src/components/appointments/AppointmentCard.tsx` | Render badge when `booked_over_block === true` |
| `src/components/appointments/AppointmentsList.tsx` | Optional filter chip "Booked over block" so setters can pull the list |

### Slack alert format (sent to `#calendar-updates`)

```
⚠ Booked over blocked time — needs setter review
Project: Vascular Surgery Center of Excellence
Calendar: Request Your GAE Consultation Twin Falls, ID
Patient: Robert Mcgovern
Booked: May 4, 2026 1:45 PM
Block created: Apr 10, 2026 by Karli (reason: patient scheduled)
[View in portal]
```

### Robert McGovern specifically

**Default: leave the appointment alone, post a backfill Slack alert** so VSCE/setters see it in the channel like any future case. No status change, no SMS — this matches the "alert-only" philosophy. Clinic already knows about him from the original email and can call him directly.

If you'd rather cancel him outright instead, say so and I'll do it as a separate one-off after this ships.

### Out of scope (intentionally)

- Auto-cancelling real patient bookings — declined, not building
- Preventing the booking upstream in GHL — separate investigation, requires GHL config changes outside the portal
- Backfilling historical conflicts — only catches new bookings going forward (plus Robert as the one backfill alert)

### Risk

Very low. New column defaults false, no behavior change for existing records, no destructive actions. Worst case: noisy Slack channel, which is easy to silence by removing the alert call.

