## Fix Replace-Existing duplicate flow

The "Replace existing appointment(s)" action in the Review Queue currently sets the existing duplicate to `status = 'Cancelled'`. That triggers downstream GHL sync (cancel/reschedule workflow), which in your case cancelled the wrong GHL appointment and kept the bad one. The action should instead hard-delete the duplicate row (same pattern as the "Use this slot" adopt-slot flow we just added), and the UI copy should say "delete" not "cancel".

### Changes (all in `src/components/admin/ReviewQueue.tsx`)

1. **`handleReplaceExisting`** — for each duplicate in `dups`:
   - Insert an `appointment_notes` row on the **surviving (new) row** attributing the deletion, e.g.:
     `Replaced existing duplicate (deleted appt id ${d.id}, was ${d.date_of_appointment} ${d.requested_time}, ${d.calendar_name}) by ${userName} - [[timestamp:...]]`
   - `DELETE` the duplicate from `all_appointments` (`.delete().eq('id', d.id)`) instead of updating status to `Cancelled` + `internal_process_complete=true`.
   - Drop the per-duplicate `appointment_notes` insert on the deleted row (FK / orphan note — write the audit note on the surviving row instead).
   - Add a `log_audit_event` call with action `replace_existing_duplicate` listing deleted ids (matches the adopt-slot audit pattern).
   - Toast becomes: `Approved new; deleted ${dups.length} prior appt(s)`.

2. **Dialog copy** (around lines 1237–1253):
   - Description: `This will APPROVE the new appointment and DELETE the existing duplicate(s) listed below. A note will be added to the approved record.`
   - Section header: `Will delete:` (was `Will cancel:`).
   - Confirm button label (if it currently says cancel-ish): keep `Confirm` but no copy change needed.

3. **No GHL outbound calls** are added — deletion is local only, matching supervisor workflow (they manually delete in GHL). This prevents the unintended GHL reschedule/cancel side effect that caused the original bug.

### Out of scope
- No changes to the "Keep existing, dismiss new" flow.
- No changes to the adopt-slot ("Use this slot") flow already shipped.
- No schema changes, no edge-function changes, no GHL API calls.

### Files
- `src/components/admin/ReviewQueue.tsx` (only file touched)
