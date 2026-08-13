# Scheduling Tags for Unscheduled Leads

Goal: GHL should always know whether a clinic has set a date/time in the Portal yet, so your SMS/reminder workflows can target only the patients still waiting.

## How it will work

Every lead captured without a date/time (Prospero Vascular and Interventional, Premier Vascular, ECCO Medical, Horizon Vascular Specialists, and Davis when it arrives unscheduled) gets a GHL contact tag the moment it lands:

- `awaiting-scheduling` — clinic has not set a date/time yet
- `appointment-scheduled` — clinic set the date/time in the Portal (the `awaiting-scheduling` tag is removed at the same moment)

Your GHL workflow can then trigger reminder messages off `awaiting-scheduling` and stop them on `appointment-scheduled`.

Aging tags are also applied by a daily sweep so you can escalate messaging over time:

- `awaiting-scheduling-24h` — still no date/time after 1 business day
- `awaiting-scheduling-72h` — still no date/time after 3 business days

All aging tags are removed when the appointment is scheduled, cancelled, or marked Do Not Call / OON, so nobody keeps receiving nudges after they drop out.

## In the Portal

- A small amber "Awaiting clinic scheduling" chip on unscheduled records, showing how long they have been waiting (e.g. "waiting 2 days").
- Once a date/time is saved, the chip disappears and the record behaves like a normal scheduled appointment (as it does today).
- The Review Queue keeps its existing Unscheduled tab; the chip and waiting time show there as well.

## Prospero specifically

Prospero Vascular and Interventional is not currently set up as an unscheduled-capture project, so its leads still expect a booked date from GHL. It will be added to the same allowlists as Premier/ECCO/Horizon so its leads land with a Morning/Afternoon time preference and no date, matching the new funnel and confirmation message.

## Technical details

- `ghl-webhook-handler`: add `'prospero vascular and interventional'` to `UNSCHEDULED_PROJECTS` and `UNSCHEDULED_PROJECTS_UPDATE`; after inserting/updating an unscheduled row, call `update-ghl-contact-tags` to add `awaiting-scheduling`.
- `all-appointments-api`: add Prospero to its `UNSCHEDULED_PROJECTS` set (same tag call on insert).
- Scheduling moment: in `AppointmentCard.tsx` (and the equivalent confirm path in `DetailedAppointmentView.tsx`), where `is_unscheduled` is flipped to `false` on date+time confirm, fire a tag update: add `appointment-scheduled`, remove `awaiting-scheduling` + aging tags. Route through the existing `update-ghl-contact-tags` function so project-specific API keys are resolved server-side.
- New edge function `sweep-awaiting-scheduling` (modeled on `sweep-short-notice-pending`, `verify_jwt = false`, run daily via cron): selects `all_appointments` rows with `is_unscheduled = true`, `date_of_appointment IS NULL`, non-terminal status; computes business-hours age from `created_at` using the project timezone; applies the 24h/72h tags; and self-heals by removing stale `awaiting-scheduling` tags from rows that have since been scheduled or hit a terminal status.
- Tag writes are idempotent (GHL add-tag is safe to repeat) and failures are logged without blocking the appointment write.

Tag names above are the defaults — tell me if your GHL workflows expect different strings and I will use yours.
