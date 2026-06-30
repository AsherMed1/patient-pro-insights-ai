Forward-only fix so a silent OON like Meelah's cannot recur. No backfill, no historical changes.

## Edits

### 1. `supabase/functions/ghl-webhook-handler/index.ts`
After the existing `statusChangeNote` block (~line 409), add a forward-only side-effect dispatcher: when GHL drives the row to `OON` or `Do Not Call`, fire `notify-slack-oon` (OON only) and `appointment-status-webhook` in the background. Failures are logged, never thrown — DB write is never blocked. The existing portal-only-status guard (line 1108) still prevents GHL from overwriting an already-OON row.

### 2. `supabase/functions/update-appointment-status/index.ts`
External REST endpoint. Add a hard 403 reject when incoming `status` normalizes to `OON` or `Do Not Call` — those are portal-only and must not be settable from outside. (Existing guard only blocked overwriting OON; this blocks writing it.)

### 3. `supabase/functions/sync-from-sheet/index.ts`
Before applying `payload.status`, drop the field (with a warning log) if it normalizes to `OON` or `Do Not Call`. Sheets are not the source of truth for terminal portal states. All other fields still sync.

### 4. `supabase/functions/sync-buffalo-appointment-statuses/index.ts`
Same skip for `csv_status`. Buffalo-only, hygiene fix.

### 5. DB migration — audit-log index
`CREATE INDEX IF NOT EXISTS idx_security_audit_log_appointment_id ON security_audit_log ((details->>'appointment_id'));` — makes future incident lookups instant. Online, non-blocking.

### 6. Memory — add Core rule to `mem://index.md`
> **OON/DNC are portal-only terminal states.** Any subsystem that writes `status='OON'` or `'Do Not Call'` to `all_appointments` MUST fire `notify-slack-oon` (OON only) + `appointment-status-webhook` + status-change note — or reject the write. No silent transitions.

## Safety notes
- All edge function changes are additive or restrictive — no existing legitimate flow regresses.
- No schema changes to `all_appointments`, no RLS changes, no destructive SQL.
- Slack/webhook failures are non-fatal (logged, not thrown).
- Forward-only: existing rows untouched.
