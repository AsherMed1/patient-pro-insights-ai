## Issue

Duzoan Jackson (NG Vascular and Vein Center) has two active "Scheduled" rows with the same `ghl_id` (`mKkz8fUikNs9SYcJ12Vx`) but different `ghl_appointment_id`s:

| Row | Created | Appt Date/Time | Status | ghl_appointment_id |
|---|---|---|---|---|
| Old | Jun 1 | Jun 19 @ 3:00 PM | Scheduled | `FeHFn2CQftJLSzcD7beN` |
| New | Jun 3 | Jun 26 @ 2:30 PM | Scheduled | `Xn67oaU9HSieOUrEYP0i` |

GHL issued a new appointment ID for the reschedule instead of editing the original, so the webhook created a second row and the existing `mark_superseded_on_change` trigger (which only handles terminal → active) left both rows active.

## Fix (data-only, no code change)

Update the old June 19 row only:
- `status` → `Rescheduled`
- `is_superseded` → `true`
- `internal_process_complete` → `true`
- `updated_at` → `now()`

Append an appointment_notes audit entry recording the manual cleanup ("Manually marked as Rescheduled — superseded by appointment on 2026-06-26 (Xn67oaU9HSieOUrEYP0i). by System").

Leave the new June 26 row untouched.

## Verification

Re-query `all_appointments` for Duzoan Jackson in NGV and confirm:
- Old row: `status='Rescheduled'`, `is_superseded=true`
- New row: `status='Scheduled'`, `is_superseded=false`
- Only the June 26 row appears in active appointment views; the June 19 row routes to Completed.

## Note

Per your direction, no trigger/webhook changes — this is a one-off cleanup. If "GHL issues a new appointment ID on reschedule" keeps happening, we'll need to revisit the long-term fix.
