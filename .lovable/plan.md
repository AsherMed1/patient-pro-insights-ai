# Fix the OON Reschedule Guard

## Problem
The webhook guard in `ghl-webhook-handler` currently treats OON, Do Not Call, and Cancelled as fully sealed. When a patient is rescheduled in GHL, the new date/time arrives but the guard blocks both the date update and the status reset — leaving recovered appointments stuck in terminal tabs with stale dates.

## Fix
Distinguish a true reschedule (new `date_of_appointment` and/or `requested_time`) from a bare status echo. Honor reschedules even when the existing status is portal-only terminal; keep blocking status-only echoes.

## Changes — `supabase/functions/ghl-webhook-handler/index.ts`

1. **Reschedule branch (~lines 648–688)**
   - Remove the `isPortalOnlyTerminal` early-return on date changes.
   - When existing status is OON / Do Not Call / Cancelled AND the date actually changed:
     - Apply the date/time update.
     - Push to `reschedule_history` with `previous_status` captured (already does this).
     - Set `status = 'Confirmed'`, `internal_process_complete = false`, `was_ever_confirmed = true`.
     - Mark `recoveredFromTerminal = true` and the prior status, pass it through `rescheduleNoteData`.

2. **Reschedule audit note**
   - When `recoveredFromTerminal`, format the note as:
     `Rescheduled from {prior status} → Confirmed via GoHighLevel — {fromDateTime} → {toDateTime} ({timestamp ET})`
   - Otherwise keep the existing reschedule note format.
   - `created_by: 'GoHighLevel'` (no "Lovable" string anywhere).

3. **Status echo branch (~lines 703–724)** — leave as-is. Status-only updates from GHL still cannot overwrite OON/DNC/Cancelled.

4. **Debounce (120s)** — leave as-is. Reschedules within the debounce window are still skipped to prevent echo loops; recovery happens on the next genuine webhook.

## Memory update
Update `mem://integrations/ghl-webhook-sync-logic-v3`: clarify that status-only GHL webhooks cannot overwrite portal-terminal statuses, but a GHL webhook carrying a new appointment date IS treated as a reschedule and resets the appointment to Confirmed with a recovery note attached.

## Out of scope
- The earlier "log every GHL status change as a note" proposal is not included here.
- No schema changes.
