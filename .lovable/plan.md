# Fix: Reserve Time Block on Double-Booking Calendars

## Problem
Humble Vascular's calendar has "Appointments per slot > 1" (double-booking enabled). Today the block flow assumes every calendar has capacity = 1, so any existing confirmed appointment overlapping the block window is treated as a **hard conflict** (would be silently cancelled by GHL). That guard was added after the VIM incident and is correct for single-booking calendars — but on a double-booking calendar, GHL treats a block as just one of the N allowed slot occupants and does **not** cancel the coexisting appointment.

Result: clinic cannot block off the second slot while keeping the first patient's appointment.

## Change

Make the conflict scan capacity-aware, per calendar.

### 1. `supabase/functions/get-ghl-calendars/index.ts`
Include `appointmentPerSlot` (GHL field, default 1) in the returned calendar objects. GHL's `/calendars/?locationId=...` list already returns it for most calendar types; if missing on a given entry, default to 1 (safe/conservative).

### 2. `src/hooks/useGhlCalendars.tsx`
Add `appointmentPerSlot?: number` to the `GHLCalendar` interface and pass it through.

### 3. `src/components/appointments/blockConflictScan.ts`
- Accept a new param `calendarCapacityByName: Record<string, number>` (name → appointmentPerSlot).
- For each candidate row that would currently be classified as **hard**, count how many *other* non-terminal appointments overlap the same slot on the same calendar+date (including the row itself). If `overlappingCount + 1 (the new block) <= capacity`, downgrade that row from `hardConflicts` to a new bucket `coexistConflicts` (informational: "will remain — calendar allows N per slot").
- If the total would exceed capacity, keep it as `hardConflicts` (GHL would still cancel).
- Soft conflicts (truly pending) stay in `softConflicts` unchanged.

Return shape becomes `{ hardConflicts, softConflicts, coexistConflicts }`.

### 4. `src/components/appointments/BlockConflictDialog.tsx`
Add a new neutral-toned "Will remain scheduled (double-booking capacity available)" section for `coexistConflicts`. These don't block submission and are not auto-cancelled. If there are only coexist conflicts (no hard, no soft), the primary button becomes **Create Block** and the copy explains the existing appointment is safe.

### 5. `src/components/appointments/ReserveTimeBlockDialog.tsx`
- Pass `calendarCapacityByName` (built from `calendars` array) into `scanBlockConflicts`.
- When opening the conflict dialog, only open it if any of hard/soft/coexist is non-empty; if only coexist, still show the dialog so the user acknowledges — but with a confirm button that proceeds normally.
- `cancelConflictingAppointments` is untouched (coexist rows are never passed in).
- No change to the create-block edge function call — GHL handles the multi-booking natively.

## Safety
- Default `appointmentPerSlot = 1` when GHL doesn't return the field → behavior identical to today for every non-double-booking calendar (no regression risk to VIM-style incidents).
- Belt-and-suspenders check in `cancelConflictingAppointments` (soft-tier only, refuses `was_ever_confirmed`) stays in place.
- Coexist rows are explicitly excluded from the auto-cancel list.
- Capacity check counts *actual* current bookings from `all_appointments`, so an already-full double-booking slot still surfaces as a hard conflict.

## Verification
1. Rerun the Humble test: block 3:00 PM on Test Johann's calendar → dialog should now show Test Johann under "Will remain scheduled" and allow **Create Block**.
2. Confirm in GHL that Test Johann's confirmed appointment is untouched after the block is created.
3. Regression check: on a single-booking calendar (`appointmentPerSlot=1`), same-slot confirmed appointment should still surface as a hard conflict and block submission.

## Out of scope
- Fetching calendar details individually (only if list endpoint omits `appointmentPerSlot`, which we handle by defaulting to 1).
- Changing GHL block-creation call.
- Any change to the past-incident recovery tooling.
