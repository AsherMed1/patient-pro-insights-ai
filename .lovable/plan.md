## Your two questions

### 1. "2/2 reserved blocks" — shouldn't it be 1?

You're right that the wording is misleading. Here's what's actually happening in your July 31, 3 PM slot:

- Calendar capacity (`appointmentPerSlot`): **2**
- Current occupants: **1 patient (Test Johann) + 2 reserved blocks = 3**

The slot is over-capacity by 1 — because the earlier bug (before yesterday's fix) let you create a second block that never should have been allowed. With capacity 2 and 1 patient scheduled, only **1** reserved block should exist in that slot, not 2.

The scan is correctly refusing your 3rd block, but the label `Slot already full (2/2 reserved blocks)` only counts blocks and ignores the patient — so it reads as if the slot is "just" full of blocks. It should say something like `Slot already full (3/2 — 1 appointment + 2 reserved blocks)` so it's obvious *why* it's full and that one of the existing blocks is a leftover from the earlier bug.

### 2. Should the block-off show in the GHL calendar?

Yes. Reserved blocks are created through GHL's `/calendars/events/block-slots` endpoint, so they exist as real block events in GHL. Two caveats worth knowing:

- On **round-robin calendars**, GHL only renders slot blocks on the assigned user's *personal* calendar view — not the shared team calendar view. This is a GHL rendering constraint, not a sync bug. (Documented in project memory: `GHL Round Robin Constraints`.)
- If a block was created but doesn't appear at all on any view, it usually means the `block-slots` POST silently failed for that team member — the edge function logs will show it.

## Fix

### A. `src/components/appointments/blockConflictScan.ts`
When synthesizing the block-only hard-conflict row, include the patient count in the label so the user sees the whole picture:

- Track patient occupancy per slot alongside block occupancy.
- Change the synthesized `lead_name` from
  `Slot already full (2/2 reserved blocks)`
  to
  `Slot already full (3/2 — 1 appointment + 2 reserved blocks)` (or `2/2 — 2 reserved blocks` when no patient is in the slot).

### B. `src/components/appointments/BlockConflictDialog.tsx`
Add a one-line explainer under the hard-conflict list when any synthesized "Slot already full" entry is present:

> One or more slots are already at (or over) the calendar's per-slot capacity. Remove an existing reserved block, shrink your window, or drop that calendar from the selection.

### C. No changes to GHL sync behavior
The block-slots creation call is already correct. I'll add a short note in the dialog after a successful block that says "Reserved blocks appear on GHL personal calendar views for the assigned team member" only if it feels needed — happy to skip if you don't want it.

## Cleanup for the leftover block on July 31

The 2nd reserved block on Test Johann's slot is orphaned from the earlier bug. You can delete it from the calendar UI (the reserved block row has a delete action), which will remove it from both the portal DB and GHL. No migration needed.

## Verification

1. Humble VSC, July 31, 3 PM, capacity 2, 1 patient + 2 blocks: dialog title now shows `Slot already full (3/2 — 1 appointment + 2 reserved blocks)`.
2. After deleting the leftover block: 1 patient + 1 block → adding another block is refused with `(2/2 — 1 appointment + 1 reserved block)`.
3. Blocks-only saturation (0 patients + 2 blocks) still shows `(2/2 — 2 reserved blocks)`.
4. Single-booking calendars unchanged.

## Out of scope

- No schema changes.
- No changes to how blocks are written to GHL.
- No auto-cleanup of the leftover block — you delete it manually from the calendar UI so nothing gets removed unexpectedly.
