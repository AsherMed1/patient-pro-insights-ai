# Client-Specific Cancellation Reasons (VSCE)

Yes — this can be scoped to one account without touching anyone else's dropdown.

## What changes

Add a per-project reason list on top of the shared ones. For **Vascular Surgery Center of Excellence** only, the cancel dialog gains:

- **Clinical Review – Not a Candidate** (Do Not Reschedule group)

Every other account sees exactly today's list. Adding more client-specific reasons later is a one-line entry in the same map.

## Behaviour of the new reason

- Lives under **Do Not Reschedule**, so it follows the existing do-not-reschedule path: GHL DND + `do-not-reschedule` tag, no reschedule SMS.
- Pushes a distinct GHL tag `cancel-reason-clinical-review-not-a-candidate`, so it is separable from patient-initiated cancellations in GHL workflows and reporting.
- Notes optional (the reason is self-explanatory); the free-text box stays available.
- Stored in `all_appointments.cancellation_reason` like every other reason, so it shows up in exports and any reason-based reporting with no schema change.

## Lead-quality reporting

Because the stored value is distinct, these cancellations can be filtered out of "patient cancelled" counts wherever cancellation reason is reported. If you also want a dedicated tile or column ("clinically disqualified after Epic review") in the reporting tab, say so and I'll add it — not included in this pass.

## Technical notes

- `src/components/appointments/cancellationReasons.ts`: add a `PROJECT_REASON_OPTIONS: Record<string, { noReschedule?: CancellationReasonOption[]; allowReschedule?: CancellationReasonOption[] }>` map keyed on exact `project_name` (`Vascular Surgery Center of Excellence`), plus `getReasonOptions(projectName)` returning the merged group lists. `NO_RESCHEDULE_REASON_VALUES` / `isNoRescheduleReason` widen to include project-specific values so the DND branch works.
- Call sites switch from the static arrays to `getReasonOptions(appointment.project_name)`:
  - `AppointmentCard.tsx` (~2478)
  - `DetailedAppointmentView.tsx` (~1654)
  - `NoShowEligibilityDialog.tsx` (~61) — needs the project name passed in from its two call sites so no-show reasons stay consistent.
- `cancellationTags.ts` needs no change: it slugifies the reason value and derives the branch flag from `isNoRescheduleReason`.
- No database migration required.
