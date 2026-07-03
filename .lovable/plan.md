## Problem

The client fix worked — the "Create Block" button now appears for double-booking calendars. But the request still fails with:

> Failed to create blocks on all calendars: Request Your GAE Consultation at Humble, TX

Edge function log:
```
[CREATE-GHL-BLOCK-SLOT] Server-side guard tripped — refusing block.
Overlapping: [{ lead: "Test Johann Booked", status: "Confirmed", time: "15:00:00" }]
```

`supabase/functions/create-ghl-appointment/index.ts` has its own overlap guard (lines 244–328) added after the VIM 2026-04-21 incident. It treats every calendar as single-booking and returns HTTP 409 `CONFIRMED_TIER_OVERLAP` whenever a confirmed appointment sits inside the window — same bug we just fixed on the client, one layer deeper.

## Fix

Make the server guard capacity-aware, matching the client scan.

**`supabase/functions/create-ghl-appointment/index.ts`**

1. Move the "Fetch calendar details" block (currently Step 1, lines 330–361) to run **before** the overlap guard so we have `calendarData` available.
2. Extract `appointmentPerSlot` from `calendarData` using the same variant list as `get-ghl-calendars` (`appointmentPerSlot ?? appointmentsPerSlot ?? appoinmentPerSlot ?? slotsPerAppointment ?? 1`), and also check `calendarData.calendar?.*`. Coerce to Number, default `1`.
3. In the overlap guard:
   - Group the fetched `candidates` by `requested_time` and count non-terminal, non-block, non-superseded occupants per slot.
   - For each confirmed-tier overlap, only add it to `blocking` when `existingInSlot + 1 > capacity`. When capacity accommodates the block, log an INFO line (`coexist overlap allowed`) and let it pass — do not write to `security_audit_log` and do not 409.
4. Preserve current single-booking behavior: if `capacity <= 1` or the calendar fetch failed (capacity unknown → default 1), the guard behaves exactly as today.
5. Leave the rest of the function (block-slots POST, local insert, rollback) untouched. GHL itself handles coexistence natively when the calendar allows multiple bookings per slot.

## Verification

- Retry the Humble Vascular July 31 block with Test Johann's 3:00 PM confirmed appointment in the slot → block should be created, Test Johann's appointment untouched in GHL.
- Regression: same scenario on a single-booking calendar → still returns 409 with `CONFIRMED_TIER_OVERLAP` and no block is created.
- Confirm edge function log shows either `Server-side guard tripped` (single-booking) or `coexist overlap allowed` (double-booking) depending on capacity.
