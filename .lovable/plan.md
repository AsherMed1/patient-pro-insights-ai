

## Short-Notice Alert Bugs and Fixes

### Three bugs identified for the John Karas alert

**Bug 1: Wrong appointment time displayed (8:00 AM ET instead of 1:00 PM CST)**

GHL sends appointment times as human-readable strings like `"Thursday, March 6, 2026 1:00 PM"`. Deno's `new Date()` parses this as **UTC** (1:00 PM UTC = 8:00 AM ET = 7:00 AM CST). The time is then stored in Postgres as `13:00:00`, but it actually represents the naive local time that was misinterpreted as UTC.

When `localDatetimeToUTC` later reads `13:00:00` from the DB and tries to apply the CST offset, the Intl `shortOffset` API appears to silently return an incorrect/zero offset in the Deno Supabase edge runtime, causing the function to return 13:00 UTC instead of 19:00 UTC (1 PM CST).

**Fix**: Replace the unreliable `Intl.DateTimeFormat` approach with a DST-aware offset calculation that checks the appointment date itself (not `new Date()`) against known DST transition rules. This applies to all three copies of `localDatetimeToUTC` in:
- `supabase/functions/ghl-webhook-handler/index.ts`
- `supabase/functions/all-appointments-api/index.ts`
- `supabase/functions/update-appointment-fields/index.ts`

The new approach will:
1. Parse the appointment date to determine if DST is active (second Sunday of March to first Sunday of November)
2. Use the correct offset (e.g., CST = -6, CDT = -5) without relying on Intl
3. Apply the offset deterministically

**Bug 2: Wrong hours calculation (13h instead of 23m)**

`checkShortNoticeAlert` uses `date_appointment_created` as the creation time, but this field is often a date-only string (`"2026-03-06"`). `new Date("2026-03-06")` = midnight UTC, not the actual creation time of 12:37 PM CST (18:37 UTC). This inflates the hours difference from ~23 minutes to ~13 hours.

**Fix**: In all three `checkShortNoticeAlert` functions, prefer `created_at` (the DB-generated timestamp with full precision) over `date_appointment_created`:
```
const createdTime = new Date(appointment.created_at || appointment.date_appointment_created);
```

**Bug 3: GHL link not working**

The link format `https://app.gohighlevel.com/v2/location/{locationId}/contacts/detail/{ghlId}` is correct. The stored `ghl_id` (`PLJVhqOcHvVwQD4hvNYc`) and `ghl_location_id` (`mmheMRxy3nM6H9lrGuKp`) match the project. This is likely a GHL permissions issue on the user's end rather than a code bug. No code change needed.

---

### Weekend / Business Day Handling

**Current setup**: The short-notice system counts pure **clock hours** between appointment creation and appointment time. Weekends are not excluded. For example, if an appointment is booked Friday at 5 PM for Monday at 9 AM, that's ~64 hours of notice.

**How it would work with business-day exclusion**: Saturday and Sunday hours would not count toward the threshold. The same Friday-to-Monday booking would count as ~16 business hours (Friday 5 PM to end of Friday = ~4h, Monday 12 AM to 9 AM = ~9h, roughly ~13 business hours depending on exact logic).

This adds complexity since you'd also need to decide whether to count by business **hours** (e.g., 8 AM - 6 PM only) or just skip full weekend **days**. Most clinics in this system appear to operate Monday-Friday, so excluding weekends would make the threshold more meaningful for staffing purposes.

My recommendation: keep it as clock hours for now. The existing per-project threshold (0-168h) already lets clinics tune sensitivity. Weekend exclusion would make the countdown harder to reason about and could mask genuinely short-notice bookings made on Fridays for Monday mornings.

---

### Summary of changes

| File | Change |
|------|--------|
| `ghl-webhook-handler/index.ts` | Fix `localDatetimeToUTC` DST logic; fix `checkShortNoticeAlert` to use `created_at` |
| `all-appointments-api/index.ts` | Same two fixes |
| `update-appointment-fields/index.ts` | Same two fixes |

Three edge functions need redeployment. No frontend changes required.

