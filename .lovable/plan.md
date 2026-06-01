## Goal

Move Betty Furr back to 1:00 PM CDT on June 3, 2026 in both HighLevel and the portal.

## Current state

- Appointment ID: `8e9d0fd8-1376-4238-89f1-de7cc5b37359`
- GHL appointment ID: `HpECCyycd5dGjESmGmxN`
- Date: 2026-06-03
- Current time: 14:00 (2 PM) — got included in the +1h Zenith shift
- Target time: 13:00 (1 PM)

## Approach

Re-use the existing `fix-zenith-timezone-shift` edge function with `shiftHours=-1` and `ids` filter scoped to just Betty Furr. The function will:

1. POST `update-ghl-appointment` with `new_date=2026-06-03`, `new_time=13:00`, `timezone=America/Chicago`.
2. Update `all_appointments.requested_time` to `13:00:00`.
3. Insert a System note recording the correction (14:00 → 13:00 CT).

## Verify

Re-query the row to confirm `requested_time=13:00:00`, and spot-check the GHL calendar detail panel.

## Out of scope

No code changes — function and filtering logic already support this flow from the prior task.
