# Rename `awaiting-scheduling-24h` to `awaiting-scheduling-48h`

The middle aging tag for Prospero becomes a 48-business-hour tag instead of 24.

## What changes

- Tag name: `awaiting-scheduling-24h` → `awaiting-scheduling-48h`
- Threshold: the daily sweep applies it after 48 business hours of waiting (was 24)
- The `72h` tag, `awaiting-scheduling`, and `appointment-scheduled` stay exactly as they are
- Cleanup still removes all aging tags when the appointment is scheduled or goes terminal — now removing the 48h name

Final tag set for Prospero:

- `awaiting-scheduling` — no date/time set yet
- `awaiting-scheduling-48h` — still waiting after 48 business hours
- `awaiting-scheduling-72h` — still waiting after 72 business hours
- `appointment-scheduled` — clinic set the date/time in the Portal

## Technical details

- `supabase/functions/sweep-awaiting-scheduling/index.ts`: rename `TAG_24H` → `TAG_48H` with value `awaiting-scheduling-48h`; change `if (hours >= 24)` to `>= 48`; update the removal list.
- `supabase/functions/ghl-webhook-handler/index.ts`: update `AWAITING_AGING_TAGS`.
- `src/lib/schedulingTags.ts`: update `AWAITING_AGING_TAGS`.
- Optional cleanup: one-off removal pass so contacts already carrying the old `awaiting-scheduling-24h` tag get it stripped on the next sweep (add the legacy name to the removal list for a while).

## GHL side

The GHL workflow currently listening on `awaiting-scheduling-24h` must be repointed to `awaiting-scheduling-48h` or it will stop firing.
