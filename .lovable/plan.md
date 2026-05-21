## Add "Pending Test Results" Procedure Option

Add a new selectable value to the procedure status dropdown so you can track patients waiting on test results before any procedure is ordered.

### Changes

1. **Dropdown options** (in `AppointmentCard.tsx` and `DetailedAppointmentView.tsx`):
   - Add `<SelectItem value="pending_test_results">Pending Test Results</SelectItem>` to the procedure status select alongside Imaging Ordered / No Procedure Ordered / Procedure Not Covered.

2. **Filter dropdown** (in `AppointmentFilters.tsx`):
   - Add a matching `Pending Test Results` option in the "All Procedures" filter so you can filter the appointment list to just these patients.

3. **Color/style chip** (`AppointmentCard.tsx` `getProcedureTriggerClass`):
   - Style this status with a distinct color (purple — `bg-purple-50 border-purple-200 hover:bg-purple-100`) so it's visually separable from the existing blue (Imaging Ordered), red, green, and gray states.

4. **Save mapping** (`AllAppointmentsManager.tsx` `updateProcedureOrdered`):
   - Treat `pending_test_results` like `imaging_ordered`: leaves `procedure_ordered` as `null` (not a terminal yes/no), only sets the `procedure_status` text column.

### Technical notes

- `procedure_status` is a free-text column, so no DB migration is required.
- Existing memory rule "Procedure Status Workflow" lists supported values (`ordered`, `no_procedure`, `not_covered`, `imaging_ordered`); after this change I will update that memory to include `pending_test_results`.
- No effect on EMR queue / IPC logic — non-terminal status leaves `internal_process_complete` untouched, same behavior as `imaging_ordered`.

### Out of scope

- No reporting/dashboard changes.
- No automation tied to this status (e.g. reminders) — can add later if you want.