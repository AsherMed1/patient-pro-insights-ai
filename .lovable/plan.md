# Add "Not a Candidate" to the Procedure dropdown

Adds one new option to the Procedure status dropdown, alongside the existing Procedure Ordered / Imaging Ordered / Pending Test Results / Pending Insurance Authorization / Procedure Complete / No Procedure Ordered / Procedure Not Covered.

Meaning: the patient was evaluated and does not qualify for the procedure — separate from "No Procedure Ordered" (nothing ordered yet) and "Procedure Not Covered" (an insurance reason).

## Behavior

- New option **Not a Candidate** (stored value `not_a_candidate`) appears in the Procedure dropdown everywhere the other options appear: the appointment card, the View Details panel, and the Procedure filter.
- Displays as a badge with its own color (slate/gray, matching the other non-ordered outcomes) so it reads clearly in the list.
- Counts as "no procedure ordered" for the legacy `procedure_ordered` boolean, exactly like No Procedure Ordered and Procedure Not Covered — so it does not inflate procedures-ordered reporting.
- Excel export and the outcomes reporting helpers pick up the new label automatically through the same status mapping.
- No other workflow side effects: it does not change appointment status, does not close the record, does not send anything to GHL, and does not require a reason note. Purely a status label plus filter.

## Technical notes

- No database migration needed — `all_appointments.procedure_status` is a free-text column with no check constraint, verified against the live schema.
- Files touched: `AppointmentCard.tsx` (dropdown item + badge mapping), `DetailedAppointmentView.tsx` (dropdown item), `AppointmentFilters.tsx` (filter item), `AllAppointmentsManager.tsx` (procedure_ordered boolean mapping → false).
- Existing records are unaffected; the option only applies going forward.
