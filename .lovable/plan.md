# Referral Requested status

Adds a first-class "Referral Requested" patient status so clinics that require a PCP referral (starting with Alliance) stop mis-using OON to free a slot. The patient stays active and visible in the Portal, the calendar slot is released, and referral wait time becomes reportable.

## What staff will see

1. **New status in the status dropdown: "Referral Requested"** (amber token, distinct from OON orange). Available on every project — Alliance is the driver but nothing is project-gated.
2. **Setting it opens a short confirmation dialog** that explains what will happen and captures an optional note (e.g. which PCP the referral was sent to). On confirm:
   - The GHL appointment event is cancelled so the slot immediately reopens for booking.
   - The Portal record keeps the patient active: date/time are cleared and the record becomes an unscheduled lead (same mechanism Premier/ECCO/Davis already use), so nothing is lost.
   - The original appointment date/time is recorded in history, so you can still see what slot they gave up.
   - A note is written: "Status changed from X to Referral Requested by {user}", plus the optional referral note.
3. **Patients awaiting referral do not go to Completed.** They route to a dedicated **Referrals** tab in All Appointments, sorted by longest wait, each row showing "Awaiting referral — N days". They are excluded from New, Needs Review, Future and Completed so counts stay clean.
4. **Rescheduling is normal.** Picking a new date/time from the record moves the patient back into the regular flow and sets the status back to Confirmed, ending the referral wait.
5. **Reporting:** a Referral Delays panel in the Reporting tab — count awaiting referral, average and median days waiting, breakdown by project and by service line, and a list of records waiting over 14 days. Filterable by date range and project, exportable to Excel like the other reports.
6. **History:** every referral status transition (requested → rescheduled/received) is appended to a referral history log on the record and rendered in the existing Activity timeline, so the full referral trail survives future edits.

## Future statuses

The status list and history log are built as a small referral lifecycle table, so adding **Referral Received** and **Ready to Schedule** later is a config change plus dropdown entry — no rework of the routing or reporting.

## GHL side (what you'd do)

The Portal will automatically push contact tags on the referral transition, mirroring how cancellation/no-show lifecycle tags already work:

- `referral-requested` added when the status is set
- `referral-requested` removed and `appointment-scheduled` added when they get rebooked

Nothing is required from you for the Portal to work. On your side you'd optionally build the GHL automation that reacts to `referral-requested` — e.g. an SMS/email asking the patient to confirm the referral was sent, or a task for the setter to follow up at 7 days. Tell me the exact tag names you want if `referral-requested` doesn't match your naming convention.

## Technical notes

- **Schema (migration):** add `referral_requested_at timestamptz`, `referral_status text`, and `referral_history jsonb default '[]'` to `all_appointments`. Add `'Referral Requested'` to the status-validation paths. Index on `referral_status` for the reporting queries.
- **Not a terminal status.** `handle_appointment_status_completion`, `qa_ingest_terminal_status` and `auto_resolve_emr_queue_on_terminal_status` are left alone — Referral Requested must not set `internal_process_complete = true` or open a QA case. The terminal list in `src/components/appointments/utils.ts` (`completedStatuses`) is not extended; a new `referral` branch is added to `filterAppointments`.
- **Status change path:** all logic lands in `src/utils/appointmentStatusChange.ts` (the single canonical path) — GHL cancel via `update-ghl-appointment`, date/time clear, `is_unscheduled = true`, history append, tag push via the existing `pushLifecycleTags` utility.
- **GHL webhook guard:** `ghl-webhook-handler` must treat `Referral Requested` as portal-owned and refuse to overwrite it with GHL "Confirmed" echoes (same protection OON/DNC/Cancelled have). A genuine new booking for that contact still supersedes normally and clears the referral state.
- **UI touchpoints:** `statusOptions` in `appointments/utils.ts`, `CALENDAR_STATUS_OPTIONS` in `StatusFilterLegend.tsx` (default off), status colour tokens, `AppointmentsTabs.tsx` new tab + count, `AppointmentFilters.tsx`, and a new `ReferralDelaysReport.tsx` in the reporting section.
- **Client visibility:** referral records remain visible to clinic portal users (they need to chase the referral); the optional referral note follows the existing internal/clinic visibility toggle.
