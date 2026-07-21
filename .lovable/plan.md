## Goal
Trim the auto-filled ControlHub ticket description created from the QA Operations Queue so it only carries the minimum context the VA needs, leaving the rest of the field free for the QA to write the issue/request.

## Change
In `src/components/admin/QAOperationsQueue.tsx`, replace `buildDefaultDescription` (currently emits QA Alert, Patient, Project, Service line, Appointment status, Appointment ID) with a three-line prefill:

```
Patient: <patient_name>
Service line: <service_line>
Appointment: <formatted appointment_date or "Not scheduled">
```

Notes:
- Drop `QA Alert:`, `Project:` (already captured in the ticket's Client field), `Appointment status:`, and `Appointment ID:`.
- If `appointment_date` is null, print `Appointment: Not scheduled` so the line is still present.
- Same prefill for both VA and Tech tickets — the user only specified VA, but the removed fields are equally redundant for Tech and the QA can always add more before submit.
- The full case metadata (project, appointment id, status, alert type, ghl contact id) is already forwarded to ControlHub in the `metadata` object by `create-controlhub-ticket` and stored on the `qa_cases` row, so nothing is lost — it just stops cluttering the editable description.

No edge function, DB, or ControlHub-side changes needed.

## Verify
Open a QA case → Create ControlHub Ticket → confirm the Description textarea shows only the three lines and the QA has room to write their explanation. Submit and confirm the ticket still lands with the correct client, service, and metadata.
