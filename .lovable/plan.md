## Problem

Double-booking calendar (`appointmentPerSlot = 2`) is letting the user create a 3rd occupant in the 3:00 PM slot on July 31:
- 1 confirmed appt (Test Johann)
- 2 reserved blocks already created
- UI still permits a 3rd block

## Root cause

Both the client scan (`blockConflictScan.ts`) and the server guard (`create-ghl-appointment/index.ts`) **skip rows where `is_reserved_block = true`** when measuring per-slot occupancy. So existing reserved blocks are invisible to the capacity math — only real patient appointments count. With capacity 2 and 1 patient appt, the guard always sees `existingInSlot (1) + 1 <= 2` and allows the block, no matter how many reserved blocks already occupy the slot.

## Fix

Count reserved blocks as occupants of the slot (they consume GHL capacity just like a real appointment does), but keep them out of the user-facing conflict lists.

### 1. `src/components/appointments/blockConflictScan.ts`
- In the candidates loop, do **not** `continue` on `is_reserved_block === true`. Instead, still bump `slotOccupancy` for that `(calendar_name, requested_time)` key, then skip pushing it into `candidates` (blocks aren't shown as conflicts, they just occupy space).
- Terminal-status rows keep their current early `continue` (they don't hold a slot).
- Net effect: when we later evaluate a confirmed overlap, `existingInSlot` includes prior reserved blocks, so `existingInSlot + 1 <= capacity` correctly fails once capacity is reached.

### 2. `supabase/functions/create-ghl-appointment/index.ts`
- Mirror the same change in the server-side overlap guard's `slotOccupancy` build: reserved-block rows count toward occupancy but are not added to the `blocking` list.
- Result: server returns 409 `CONFIRMED_TIER_OVERLAP` (or a new `SLOT_CAPACITY_EXCEEDED` reason) when capacity is already saturated by patient appts + existing blocks.

### 3. Dialog copy (`BlockConflictDialog.tsx`)
- When the coexist path fails purely because prior reserved blocks fill the slot (no confirmed patient conflict), surface a clear hard-conflict message: "This slot is already fully booked (2 of 2 slots taken, including existing reserved blocks). Remove an existing block or shrink your window."
- Achieved by tagging synthetic hard-conflict entries from the scan when capacity is exceeded by blocks-only, so the existing hard-conflict UI can render them without new components.

## Verification

1. Humble VSC, July 31, 3 PM, calendar with `appointmentPerSlot = 2`:
   - State A: 1 patient + 0 blocks → allow (coexist).
   - State B: 1 patient + 1 block → block creation refused with capacity message.
   - State C: 0 patients + 2 blocks → block creation refused.
2. Single-booking calendar regression: 1 patient + 0 blocks still refuses (unchanged).
3. Edge function log shows `slot capacity exceeded` info line when refused for capacity, `coexist overlap allowed` when allowed.

## Out of scope

- No schema changes.
- No changes to how blocks are written to GHL — GHL itself enforces its own per-slot cap; we're aligning our pre-flight math with it.