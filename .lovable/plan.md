## Problem

Ally Vascular reports that rescheduling appointments in the portal does not reflect in GoHighLevel.

There are two reschedule paths in the portal:

1. **Reschedule dialog** (status → Rescheduled) — `AppointmentCard.handleRescheduleSubmit` — already calls `update-ghl-appointment`.
2. **Inline date/time pickers** on the appointment card — go through `updateAppointmentDate` / `updateRequestedTime` in `AllAppointmentsManager.tsx`, which call the `update-appointment-fields` edge function. **That edge function writes an audit note and updates the local row but never calls GHL.**

DB confirms it: every recent Ally `appointment_reschedules` row (Victor Diaz, Adrian Cook, Mark McGraw, Geraldine Liggins, etc., 18+ entries) is stuck at `ghl_sync_status = 'pending'`, `ghl_synced_at = null`, `processed = false` — they came from inline edits, not the dialog.

## Fix

Address both paths to be safe.

### 1. Inline date and time edits (primary culprit)

Add a GHL sync step inside the two handlers in `src/components/AllAppointmentsManager.tsx`, mirroring the proven logic in `handleRescheduleSubmit`:

**`updateAppointmentDate`** (~line 968): after the `update-appointment-fields` call succeeds, fetch the appointment's `ghl_appointment_id` (from local state) plus the project's `timezone`, `ghl_location_id`, and `ghl_api_key`. If `ghl_appointment_id` exists and the project has a `ghl_location_id`, invoke `update-ghl-appointment` with `new_date` (the value just saved) and `new_time` (current `requested_time`, fallback `09:00`). Persist `last_ghl_sync_status` / `last_ghl_sync_at` / `last_ghl_sync_error` on `all_appointments`. Show a warning toast on GHL failure (local save already succeeded).

**`updateRequestedTime`** (~line 1045): same pattern — after the field update, sync `new_date = date_of_appointment`, `new_time = normalizedTime`. Skip GHL if `date_of_appointment` is null (a time-only change with no date can't be pushed).

No-op (no error toast) when `ghl_appointment_id` is missing or the project has no `ghl_location_id` (unscheduled projects like Premier, ECCO, Davis).

### 2. Reschedule dialog (sanity pass)

`handleRescheduleSubmit` already calls `update-ghl-appointment`. After the inline fix is live, verify with the user that Ally's reschedule-dialog flow also works. If it doesn't, pull `last_ghl_sync_error` from a recent failed Ally row and we'll investigate the edge function's GHL call separately. No code change yet for this path — the dialog code is identical to the working pattern.

### Why client-side, not in the edge function

Every other reschedule path (`handleRescheduleSubmit`, `DetailedAppointmentView`, `ReserveTimeBlockDialog`) already invokes `update-ghl-appointment` directly from the client. Keeping the inline editors consistent is the smallest change and leaves `update-appointment-fields` generic for non-date edits.

### Verification

- Reschedule Adrian Cook (or any Ally appt with a `ghl_appointment_id`) via the inline date picker → confirm the GHL calendar in the sub-account shows the new date.
- Confirm `last_ghl_sync_status = 'success'` and `last_ghl_sync_at` populated on `all_appointments`.
- Verify the existing Reschedule dialog still works (untouched).
- Verify Premier / ECCO / Davis (no `ghl_location_id`) edit cleanly with no error toast.

### Out of scope

- Backfilling the 18+ stale `appointment_reschedules` rows already stuck at `pending` (can be addressed separately if needed).
- Any change to `update-appointment-fields` edge function.
- Any change to the Reschedule dialog code.
