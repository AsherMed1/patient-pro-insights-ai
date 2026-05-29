# Fix Zenith Vascular & Fibroid Center Time Zone Shift

## Problem
GHL location timezone was switched from ET → CT at Zenith. Existing appointments were stored as wall-clock times that now read 1 hour earlier in CT (e.g., Edward Stephens shows 7:00 AM CDT in GHL but should be 8:00 AM CDT). Reminders are about to be turned on and must show the correct local time.

## Scope
- Project: **Zenith Vascular & Fibroid Center**
- Only **upcoming appointments** (date_of_appointment >= today)
- Only **Confirmed** status (per Kathryn's confirmation — exclude Welcome Call, Cancelled, Rescheduled, etc.)
- Shift each appointment **+1 hour** in:
  1. `all_appointments` (date_of_appointment / time fields)
  2. GHL (via `update-ghl-appointment` edge function, which reschedules the GHL event)

Current count from query: ~15 Confirmed upcoming Zenith appointments (Jun 3 – later).

## Implementation

Create a one-off backfill edge function `fix-zenith-timezone-shift`:

1. Query `all_appointments` where:
   - `project_name = 'Zenith Vascular & Fibroid Center'`
   - `status = 'Confirmed'`
   - `date_of_appointment >= CURRENT_DATE`
   - `ghl_id IS NOT NULL`
2. For each row:
   - Compute new datetime = existing appointment datetime + 1 hour
   - Call existing `update-ghl-appointment` with `new_date`, `new_time`, `timezone='America/Chicago'`, `project_name`, `ghl_appointment_id=ghl_id`
   - On success, update `all_appointments` with shifted date/time + add an `appointment_notes` audit row ("System: Time zone correction +1h applied after GHL location TZ change")
   - Set a flag to suppress the GHL webhook echo-back (the function already debounces, but log clearly)
3. Return summary `{ updated: [...], failed: [...] }`

Trigger via an admin-only button OR a single `curl` invocation. Given it's a one-shot, run via `supabase--curl_edge_functions` after deploy and report results.

## Safeguards
- Dry-run mode (`?dryRun=true`) first — log the planned new times, no writes
- Process sequentially with 500ms delay (avoid GHL rate limits)
- Skip any appointment whose date is in the past by the time it runs
- Do NOT touch Welcome Call / terminal statuses

## Deliverable
- New edge function `supabase/functions/fix-zenith-timezone-shift/index.ts`
- Run dry-run, share preview list, then run live after your confirmation
- Final report listing each patient with old time → new time and GHL update status

## Out of scope
- Reminder enablement (Kathryn will toggle in GHL)
- Welcome Call / pending appointments
- Other clinics
