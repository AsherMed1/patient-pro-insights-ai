## What happened with LaShawn Askew

We did add guards, but they don't cover this exact scenario. Here's the timeline:

- **Jul 17** — GHL created appointment `WaCSCVTGB9GdYGP3AfKg` for Jul 23 at 2:40 PM. Setter didn't submit insurance (patient was driving), so it never came through our webhook (or came through and was later removed — nothing exists in `all_appointments` before Jul 28).
- **Jul 19** — GHL workflow auto-cancelled the unconfirmed appointment.
- **Jul 28** — Patient uploaded insurance. GHL flipped the appointment back to Confirmed and re-fired the webhook. We received it as a **brand-new payload** (no existing row for that `ghl_appointment_id`) and inserted a fresh Confirmed row with `date_of_appointment = 2026-07-23` — a date already in the past.

Our existing protections:
- Terminal-status guard blocks new inserts when incoming status is `Cancelled/No Show/Showed` — didn't trigger, status came in as `Confirmed`.
- Portal-only terminal guard preserves `Cancelled/OON/DNC` on existing rows — didn't trigger, no existing row.
- Reschedule recovery from terminal — didn't trigger, no existing row.

So the missing guard is: **new appointment insert with a past date**. GHL's reconfirm-a-cancelled-past-appointment flow slips through as "new booking in the past."

## Fix

Add a past-date guard to the new-appointment branch of `ghl-webhook-handler` (mirrors the terminal-status guard right next to it):

- After the existing terminal-status skip (`~line 280`), before insert:
  - If `!isUpdate` AND `webhookData.date_of_appointment` is set AND that date+time is more than **6 hours** in the past (using project timezone if resolvable, else UTC), skip the insert.
  - Return `{ success: true, operation: 'skipped', reason: 'past_date_new_appointment', ... }` so GHL sees 200 and doesn't retry.
  - Log the block with `requestId`, `lead_name`, `ghl_appointment_id`, `date_of_appointment` so we can audit.
- Unscheduled-capture projects (Premier Vascular, ECCO, Davis, Horizon) send `date_of_appointment=null` and are unaffected.
- Real reschedules of an existing row are unaffected (this only fires on the *insert* path).
- The 6-hour cushion absorbs timezone skew and same-day-earlier bookings that are legitimately "just past."

### One-off cleanup for LaShawn Askew

- Set `status='Cancelled'`, `cancellation_reason='Auto-cancelled by GHL workflow on 2026-07-19 (missing insurance); appointment date already passed when re-confirmed on 2026-07-28'`, `internal_process_complete=true`.
- Append a system note explaining the cleanup so Gianna/Rachel see it in the timeline.
- Leave the GHL side alone — clinic will contact the patient to reschedule per the Slack thread.

## Files touched

- `supabase/functions/ghl-webhook-handler/index.ts` — add past-date guard next to the terminal-status guard.
- One-off SQL update + note insert for appointment `0338723a-f116-4b8a-b906-d6e5109ace48`.

No schema changes, no frontend changes.