# Make all blue "System" notes internal-only

## Behavior

Every note authored by `System` (the blue "Auto" notes) becomes internal — team-only, never shown to clinic users. Notes from named users and from `GoHighLevel` are unaffected and stay clinic-visible as today.

Current state (verified): 6,263 `System` notes are stored as `clinic` and are readable by clinic users; 2,098 `GoHighLevel` notes stay clinic-visible.

## Change

1. Backfill: set `visibility = 'internal'` on every existing `appointment_notes` row with `created_by = 'System'`.
2. Stop writing new System notes as clinic-visible. These four call sites currently insert `visibility: 'clinic'` under the `System` author and switch to `internal`:
   - `supabase/functions/ghl-webhook-handler/index.ts` (service-change note)
   - `supabase/functions/sweep-short-notice-pending/index.ts` (short-notice auto-applied)
   - `supabase/functions/sync-ghl-appointment-times/index.ts` (date/time re-sync)
   - `src/components/appointments/AppointmentCard.tsx` and `src/components/appointments/DetailedAppointmentView.tsx` (cancellation reason / Welcome Call note)
3. Team users keep the per-note toggle, so any individual System note can still be flipped to clinic-visible manually when a clinic genuinely needs to see it.

## Technical notes

- Backfill runs as a data-only migration; no schema or RLS change.
- Portal status-change notes are authored under the acting user's name (not `System`), so they remain clinic-visible.
- Affected edge functions get redeployed after the edit.
