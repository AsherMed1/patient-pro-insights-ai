## Goal

When a clinic reserves time in the portal and confirmed GHL appointments already sit inside that window, stop refusing the block. Instead, block every minute in the window **except** the slots already taken by those patients. No existing appointment is cancelled, and GHL still blocks all the other time.

## Current behavior (why it fails today)

`src/components/appointments/BlockConflictDialog.tsx` shows a hard error ("Will be cancelled in GoHighLevel — fix before continuing") and the only footer action is **Adjust Block**. That guard exists because GHL silently cancels confirmed appointments that overlap a reserved block pushed to the same calendar. So the portal blocks the create outright.

## New behavior

Turn "hard conflict = stop" into "hard conflict = carve around". For each calendar in the selection:

1. Take the requested window (e.g. 5:00 PM – 6:00 PM).
2. Subtract every overlapping confirmed appointment's slot (start → start + duration, default 30 min if duration unknown) on that calendar.
3. Push the resulting sub-ranges to GHL as one or more reserved blocks. If nothing is left, that calendar is skipped for the block (with a note in the summary).
4. Never touch the existing appointments — no cancel, no reschedule, no GHL status write.

Soft (unconfirmed) conflicts keep today's flow: user chooses auto-cancel or leave-pending. Coexist (double-booking) calendars keep today's flow.

## UX changes

`BlockConflictDialog`:
- Rename the red section to "Will be preserved — block will skip these slots" with a green/neutral tone.
- Replace the italic warning with: "These appointments stay booked. The reserved block will cover the rest of your window and skip each patient's 30-minute slot."
- Replace the **Adjust Block**-only footer with **Cancel** + **Create Block Around Appointments** (primary). Keep **Adjust Block** as a secondary link for the user who'd rather shrink the window themselves.
- When splitting leaves zero blockable minutes on a calendar, show that calendar in a "Fully occupied — nothing to block" list and let the user proceed (those calendars are skipped).

## Backend / logic changes

- `src/components/appointments/ReserveTimeBlockDialog.tsx`: on confirm, when `hardConflicts.length > 0`, compute per-calendar "carve" ranges from the confirmed appointments' start times + durations and iterate the existing "create reserved block" path once per sub-range instead of aborting.
- Reuse the existing GHL reserved-block edge function; just call it N times per calendar with the split windows. No new edge function required.
- Record the split in `reserved_time_blocks` (or the existing block table) as sibling rows sharing a `parent_block_id` / `notes` marker so the UI can render them as one logical block later.
- Log an internal note on each preserved appointment: "Clinic reserved {window} on {date}; this appointment was kept and the block was routed around it." (uses existing `appointment_notes` writer, no schema change.)

## Guardrails

- Do NOT push anything to GHL for a sub-range that ends up shorter than 5 minutes — drop it (avoids junk 1-minute holds).
- Terminal / superseded appointments are ignored when carving (they aren't real conflicts).
- Coexist and soft-conflict handling is unchanged.
- Admin-only override is not needed — this becomes the default for everyone since it's non-destructive.

## Files touched

- `src/components/appointments/BlockConflictDialog.tsx` — copy, tone, footer buttons.
- `src/components/appointments/ReserveTimeBlockDialog.tsx` — carve-and-loop create path; success toast summarising "Blocked 45 min across 2 segments, preserved 2 appointments".
- `src/components/appointments/blockConflictScan.ts` — expose per-conflict `duration_minutes` (fallback 30) so the carve logic has what it needs.
- No DB migration. No edge function changes beyond calling the existing reserved-block creator multiple times.

## Test plan

1. Reproduce the Painless Center Clifton case (John Ospina 5:30 PM PAE, Roger Sottovia 5:00 PM GAE).
2. Request a 5:00 PM – 6:00 PM block on both calendars.
3. Expect: PAE calendar gets a 5:00–5:30 block; GAE calendar gets a 5:30–6:00 block; both patients still Confirmed in the portal and in GHL.
4. Try a 5:00 PM – 5:30 PM block on the GAE calendar (fully occupied) — dialog shows "nothing to block on this calendar" and no GHL call fires for it.
