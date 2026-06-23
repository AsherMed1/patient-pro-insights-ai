## Reset unscheduled appointment when time_preference changes

When `time_preference` is updated on an unscheduled-capture project (Davis Vein & Vascular, ECCO Medical, Premier Vascular, Premier Vascular Surgery), treat it like a reschedule on the same row: refresh the lifecycle so the lead re-enters the active pipeline instead of staying on whatever terminal/completed state it was in.

### What changes on the row when time_preference changes
- `status` → `Pending`
- `internal_process_complete` → `false`
- `procedure_ordered` → `null`
- `procedure_status` → `null`
- Append an entry to `reschedule_history` JSONB: `{ at, source: 'ui' | 'ghl_webhook', old_pref, new_pref, by }`
- `updated_at` → `now()`
- Leave `review_status` alone (Davis/ECCO/Premier stay `approved` per existing exempt rule)

### Where the logic lives
A single DB trigger is the cleanest place because both UI edits and GHL webhook updates already write to `all_appointments.time_preference`. One trigger covers both sources without touching the UI or three edge functions.

**New trigger:** `handle_unscheduled_time_preference_change` on `all_appointments` BEFORE UPDATE, fires only when:
- `OLD.is_unscheduled = true` AND
- `NEW.time_preference IS DISTINCT FROM OLD.time_preference` AND
- `NEW.project_name` is in the unscheduled-capture set

Logic mirrors `handle_appointment_status_completion` (which already resets these same fields when status flips to Pending) and appends to `reschedule_history` the way `appointment_reschedules` flow does.

### UI follow-ups (small)
- `AppointmentCard.tsx` line 1537-1546: keep the existing `update` call — the trigger handles the rest. Update the toast to "Time preference updated — appointment reset to Pending" so the user knows.
- Refresh the card after save (already calls `onDataRefresh?.()`).

### Edge function follow-ups
None required. `ghl-webhook-handler` and `fetch-ghl-contact-data` already issue plain `update` statements; the trigger runs server-side regardless of caller.

### Out of scope
- No new row created — existing row is reset (per your choice).
- Review queue behavior unchanged (Davis/ECCO/Premier stay auto-approved).
- No backfill of historical rows.
- No change for non-unscheduled projects.

### Files touched
1. **New migration** — create `handle_unscheduled_time_preference_change()` function + BEFORE UPDATE trigger on `all_appointments`.
2. **`src/components/appointments/AppointmentCard.tsx`** — toast copy tweak only (~2 lines).