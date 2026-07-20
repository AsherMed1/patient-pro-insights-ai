## Fix Joe Leydon status mismatch

**Current state (verified):**
- Portal row `1cfab93a...` has `status = 'Welcome Call'`, last updated Jul 7.
- GHL shows the appointment as **Cancelled**.
- The GHL→portal sync fix for "Welcome Call" (removing it from `portalOnlyStatuses`) was deployed after this row was last updated, so no incoming webhook has corrected it. This row needs a one-off data update.

**Change:**
- Update `all_appointments.id = 1cfab93a-a4a7-446f-ac0f-03721f96da4c`:
  - `status` → `Cancelled`
  - `internal_process_complete` → `true` (terminal status per Core rules)
  - `updated_at` → now
- Add an `appointment_notes` audit entry noting the manual sync-repair from GHL (attributed to "System").

**Not doing:**
- No code changes — the handler fix is already live and will handle future cases.
- Not touching GHL (source of truth already Cancelled).

Please confirm and I'll apply the update.