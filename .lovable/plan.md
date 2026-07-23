# QA "Appt date" mismatch — Che Ngang and future cases

## Root cause (verified)

Che Ngang has two `qa_cases` rows tied to the same appointment `f8b82dd2…` (Vascular and Embolization Specialists, `US/Eastern`):

- Stale row: `appointment_date = 2026-07-27 13:30:00+00` → renders **9:30 AM ET** (what you saw in QA Ops)
- Fresh row: `appointment_date = 2026-07-27 17:30:00+00` → renders **1:30 PM ET** (matches Portal + GHL)

Portal reads `all_appointments.date_of_appointment` + `requested_time` (`2026-07-27` + `13:30:00` in project TZ → 1:30 PM ET). The stale QA row was written earlier when the appointment_date was captured as a naive/UTC value and was never refreshed on later reschedules — only `qa_upsert_case` refreshes `appointment_date`, and only when a new alert fires. So any QA row that outlives a reschedule keeps a stale time.

## Fix

Stop trusting the frozen `qa_cases.appointment_date` in the UI. Always render the QA "Appt date" from the live `all_appointments` row, formatted in the project timezone — same source the Portal uses.

### 1. QA drawer (`src/components/admin/QAOperationsQueue.tsx`)

- When the drawer opens for a case with `appointment_id`, fetch `date_of_appointment` + `requested_time` (already fetched via `openPortalRecord` for the record modal — extend the initial load so we always have it).
- Compute `liveApptTs = qa_build_appt_ts(project_name, date_of_appointment, requested_time)` client-side using `formatInTimeZone` on the combined local wall time, then display it via existing `formatApptDate`.
- Fall back to `caseData.appointment_date` only when `appointment_id` is null or the appointment row is missing.
- Apply the same live lookup to the "Appointment: …" text in the ticket description auto-fill (line 836) so tickets carry the correct time.

### 2. QA list row

- The row currently shows `caseData.appointment_date`. Include `date_of_appointment` + `requested_time` in the list query (join or batched fetch keyed by `appointment_id`) and render the live value the same way. Keeps list and drawer consistent.

### 3. Backfill + trigger hygiene (data only, no schema change)

- One-time SQL: for every `qa_cases` row with an `appointment_id`, recompute `appointment_date = qa_build_appt_ts(project_name, a.date_of_appointment, a.requested_time)` from `all_appointments`. This corrects Che Ngang's stale row and any siblings.
- Extend `qa_cases_maintain_derived` (or add a lightweight trigger on `all_appointments` UPDATE of `date_of_appointment` / `requested_time`) to recompute `appointment_date` on every linked QA case so future reschedules never drift again.

## Out of scope

- No changes to Portal formatting, GHL webhook, or `qa_build_appt_ts` itself.
- Not touching alert-type logic, buckets, or ticket routing.

## Technical notes

- `qa_build_appt_ts(project_name, date, time)` already resolves project timezone correctly — reuse it in the backfill and trigger; the UI keeps using `formatInTimeZone(iso, apptTz, 'PP p')`.
- Realtime already resubscribes case rows, so the trigger-driven refresh will propagate to open drawers without extra client work.
