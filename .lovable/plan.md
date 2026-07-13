## Add "Pending Insurance Authorization" procedure status

New procedure-dropdown option (value `pending_insurance_auth`, label **Pending Insurance Authorization**). It sits alongside the existing `imaging_ordered` / `pending_test_results` options and behaves the same way — a post-consultation tracking state that leaves appointment `status` (Confirmed, etc.), GHL sync, and Meta/conversion tracking untouched.

### Files to edit

1. **`src/components/appointments/AppointmentCard.tsx`**
   - Add `<SelectItem value="pending_insurance_auth">Pending Insurance Authorization</SelectItem>` to the Procedure dropdown (after `pending_test_results`, before `no_procedure`).
   - Add a color branch in `getProcedureTriggerClass` (amber/indigo tint, e.g. `bg-amber-50 border-amber-200 hover:bg-amber-100`) so the trigger is visually distinct from the existing statuses.

2. **`src/components/appointments/DetailedAppointmentView.tsx`**
   - Same new `SelectItem` in the procedure Select (around line 977).

3. **`src/components/appointments/AppointmentFilters.tsx`**
   - Same new `SelectItem` in the procedure filter dropdown (around line 296) so clinics can filter/report on it.

4. **`src/components/AllAppointmentsManager.tsx`**
   - Extend the `procedureStatus → procedure_ordered` mapping (~lines 921-926) to include `pending_insurance_auth → null`, mirroring how `imaging_ordered` and `pending_test_results` are treated. No other query logic changes — existing `.eq('procedure_status', filter)` handles the new value automatically.

### What is intentionally NOT changed

- No DB migration — `all_appointments.procedure_status` is a free-text column with no CHECK constraint.
- No changes to appointment `status` handling, `handle_appointment_status_completion` trigger, EMR queue, GHL webhook handler, Slack/Meta/conversion webhooks, or the `was_ever_confirmed` flag. Confirmed appointments stay Confirmed; this is purely a procedure-side label.
- Excel export already emits `procedure_status` verbatim, so the new value flows into reports with no code change.

### Verification
- Open a Confirmed appointment, set procedure to Pending Insurance Authorization, confirm the badge/trigger renders in amber and no GHL sync fires.
- Change it to `ordered` and confirm the existing "Procedure Ordered" path still triggers normally.
- Filter the appointments list by "Pending Insurance Authorization" and confirm counts + list match.
