## Root cause

I checked the July 31 data for Humble. The two existing reserved blocks are **whole-day blocks** — `requested_time = 09:00`, `reserved_end_time = 17:00`. Test Johann is at `15:00`. Capacity for the GAE calendar is 2.

Both the client scan (`blockConflictScan.ts`) and the server guard (`create-ghl-appointment/index.ts`) only count a reserved block at its **start slot** (09:00). Nothing counts the block as occupying 09:30, 10:00, …, 15:00, …, 16:30 — even though in GHL that whole-day block is holding all of those slots.

Consequence of the bug:

- Slot **09:00** occupants = 2 blocks → capacity hit → the 3rd block is refused (this is why you finally get blocked on the 3rd try).
- Slot **15:00** occupants counted by the scan = 1 patient only. The existing block that is actually sitting on top of 15:00 is invisible to the counter, so the scan happily allows another block ("1 + 1 ≤ 2, coexist").

So the count you see in your head — "15:00 already has 1 patient + 1 block = 2/2, no more allowed" — is right. The scanner just isn't looking at `reserved_end_time`, so it never notices the block covers 15:00.

## Fix

### A. `src/components/appointments/blockConflictScan.ts`
1. Include `reserved_end_time` in the `select`.
2. For every reserved block, parse `[requested_time, reserved_end_time)` into a `[startMin, endMin)` range instead of a single point.
3. Build a per-slot occupancy map keyed by the **patient's** `requested_time` (and each existing block's `requested_time` when there is no patient in that slot). For each key T in the new block's window, count:
   - `1` if a non-terminal patient sits exactly at T, plus
   - the number of existing reserved blocks whose range contains T.
4. Confirmed-tier check becomes: `patients_at_T + blocks_covering_T + 1 > capacity` → hard conflict (label includes both counts, e.g. `Slot already full (3/2 — 1 appointment + 1 reserved block covering this slot)`).
5. Block-only saturation check: for every slot start T inside the new window that has no patient, if `blocks_covering_T + 1 > capacity`, synthesize the existing `block-cap::` hard row (label `(count/capacity — N reserved block(s) covering HH:MM)`).

### B. `supabase/functions/create-ghl-appointment/index.ts`
Mirror the same change server-side (this is the guard that can't be bypassed):

1. Add `reserved_end_time` to the overlap-scan `select`.
2. Replace the `slotKey = requested_time` model with the same per-slot loop: for each slot T in the new block's `[startMin, endMin)` where an existing patient sits **or** an existing block starts, compute `patients_at_T + blocks_covering_T + 1` and compare against `appointmentPerSlot`.
3. Push into `blocking` (with the appropriate label) whenever any slot exceeds capacity, whether the excess is from a patient + prior block, a patient + multiple blocks, or blocks alone.
4. Keep the existing `capacityOnly` / `SLOT_CAPACITY_EXCEEDED` vs `CONFIRMED_TIER_OVERLAP` response branching. A patient-and-block collision is still a "capacity" refusal (no confirmed patient is at risk of silent cancellation), so return `SLOT_CAPACITY_EXCEEDED` when every blocking row is either a `Reserved block` or a patient that only became blocking because of prior blocks eating the slot.

### C. No UI copy change needed in `BlockConflictDialog.tsx`
The existing "One or more slots are already at (or over) the calendar's per-slot capacity…" explainer already fits. It'll now fire in the 1-patient + 1-block case too because that row will be synthesized as a `block-cap::` entry.

## Out of scope
- No schema changes.
- No changes to how blocks are written to GHL.
- Single-booking calendars (capacity 1) behave identically to today — a patient already forces refusal.
- Nothing changes for blocks that are single-slot (start == end + 1 slot) — they collapse to the same behavior as before.

## Verification

Using your Humble July 31 state (2 whole-day blocks 09:00–17:00 + Test Johann at 15:00, capacity 2):

1. Delete both existing blocks → slot 15:00 has 1 patient, all other slots empty.
2. Create a whole-day block → allowed. Slot 15:00 now has 1 patient + 1 block (covering).
3. Try to create another whole-day block → **refused** with `Slot already full (3/2 — 1 appointment + 1 reserved block covering this slot)` on slot 15:00.
4. Delete that block, then create a whole-day block again → allowed.
5. Try to create a 10:00–11:00 block (does not cover 15:00) → allowed if capacity permits at 10:00/10:30. Correctly ignores the 15:00 collision because the new block doesn't touch that slot.
6. Blocks-only saturation (no patient in slot) still refuses at `2/2 — 2 reserved blocks covering HH:MM`.
7. Single-booking calendar (capacity 1) with any patient in window → still refused as before.
