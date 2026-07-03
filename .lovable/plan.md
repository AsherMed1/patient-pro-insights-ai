## Problem

When a slot is saturated by 1 patient appointment + 1 existing reserved block on a capacity-2 calendar, the block conflict dialog only lists the patient (e.g., "Test Johann Booked, 3:00 PM, Confirmed"). The existing reserved block is invisible, so the user sees "1 appointment overlap" and can't tell *why* they're being blocked — it looks like a single confirmed appointment should still fit under capacity 2.

## Fix

Surface the existing reserved block(s) in the conflict list alongside the patient row, so the math is obvious (1 appt + 1 reserved = 2/2 full).

### `src/components/appointments/blockConflictScan.ts`

In the patient loop, when a confirmed-tier patient is pushed to `hardConflicts` **because of slot saturation** (i.e., `capacity > 1` and `projected > capacity` with `blocksHere > 0`), also synthesize a companion informational row for each existing block covering that slot. Track already-emitted blocks by row id to avoid duplicates when multiple patients share the slot.

The companion row uses the existing `BlockConflict` shape:
- `id`: `block-existing::${block.row.id}` (unique, non-`block-cap::` prefix so the capacity-warning banner logic in `BlockConflictDialog` still fires correctly on the `block-cap::` synthesized rows in the pure-blocks-saturation path)
- `lead_name`: the block's `lead_name` (typically "Reserved" or the user-entered title)
- `requested_time`: block's `requested_time`
- `status`: `"Reserved block"`
- `calendar_name`: same calendar
- Other fields: null / passthrough

Result in the dialog for the current case:
```
Will be cancelled in GoHighLevel — fix before continuing
  Test Johann Booked          3:00 PM   Confirmed        (patient — real hard conflict)
  Reserved - <title>          9:00 AM   Reserved block   (companion, context)
```

Plus the existing capacity-warning banner still appears because the header count now shows 2 items and the user can see the slot is already at 1 appt + 1 block.

### No other files change
- `BlockConflictDialog.tsx` already renders any hard-conflict row generically via `ConflictRow`; no UI changes needed.
- `supabase/functions/create-ghl-appointment/index.ts` server guard is unchanged (server only needs to *block*, not explain).

### Out of scope
- No change to which cases are blocked vs allowed — the guardrail behavior from the previous fix stays exactly the same.
- No schema changes.
