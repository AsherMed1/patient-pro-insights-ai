# Premier unscheduled leads: stop showing "Unknown" service and location

## What's actually wrong

Premier patients who pick a time-of-day preference instead of a slot arrive as contact-only leads with no GHL calendar attached, so the portal stores `calendar_name = "Unknown"`. Everything downstream — the portal Service/Location filters and the QA Operations Queue "Service" column — reads that one field, so those records show "Unknown".

The information is not missing. Confirmed on the actual rows: the intake blob contains `Service Name: GAE` (or PFE/UFE) and `Calendar ID: rxCout3fUGWx7S51d3JS`, and the parsed pathology carries `procedure_type: GAE`. Premier has exactly one active location (Macon, GA — Milledgeville is retired), and scheduled Premier rows use the calendar naming `Request your <SERVICE> Consultation at Macon, GA`.

There is already a recovery step in the GHL webhook handler that tries to turn `Calendar ID` into a calendar name by calling the GHL calendars API, but no Premier row has been recovered — 92 Premier rows currently sit at `calendar_name = "Unknown"`, so that path is not producing a result for these leads.

## Fix

1. **Deterministic service/location resolution for unscheduled leads.** When the calendar-API recovery returns nothing, derive the service from the intake fields (`Service Name`, falling back to `parsed_pathology_info.procedure_type`) and the location from the project's active location list (single-location projects like Premier resolve straight to Macon, GA; multi-location projects use the funnel's `Location Picker` value when present).
2. **Write it back as a normal calendar label.** Compose `Request your <SERVICE> Consultation at <LOCATION>` matching Premier's existing calendar names, and store it in `calendar_name`. No schema change, and every existing consumer (portal Service filter, Location filter, QA queue Service column, reports) starts working with no per-screen patching. If neither service nor location can be resolved, leave the value blank rather than the literal string "Unknown".
3. **Leave scheduling alone.** Date, time, and requested time stay blank; `is_unscheduled` and `time_preference` (morning / afternoon / evening / no preference) keep rendering exactly as today.
4. **QA Operations display.** QA cases copy the calendar name into `service_line` at ingest, so new cases pick this up automatically. Also stop rendering the literal "Unknown" in the queue and the case drawer — fall back to the appointment's parsed procedure, then to "—".
5. **Backfill.** Repair the 92 existing Premier rows (and their QA cases) using the same resolution rules, so the current queue stops showing "Unknown" for records already captured.
6. **Scope.** The same rule applies to the other unscheduled-capture clinics (ECCO Medical, Davis Vein & Vascular, Horizon Vascular), since they hit the identical contact-only path. Only rows currently at "Unknown" are touched; rows with a real calendar name are never overwritten.

## Technical notes

- `supabase/functions/ghl-webhook-handler/index.ts`: extend the block at lines 145-160. After `resolveCalendarNameFromNotes` returns null, add `deriveCalendarNameFromIntake(projectName, notes, parsedPathology)` — regex `Service Name:\s*(\w+)` plus a project→locations map (Premier → `Macon, GA`, honoring the existing Milledgeville/Somerset exclusions), composing `Request your <SVC> Consultation at <LOC>`. Apply only when `calendar_name` is missing or `"Unknown"`. Log which path produced the value.
- Also log the failure reason inside `fetchLocationCalendars` when the GHL call returns non-OK, so the primary recovery path is diagnosable going forward.
- `src/components/admin/QAOperationsQueue.tsx`: treat `service_line === 'Unknown'` as empty in the queue cell (line ~1106), the drawer subtitle (line ~1863), and the ticket payload (line ~1768).
- Backfill migration: `UPDATE all_appointments` where `project_name` in the unscheduled-capture set and `calendar_name` is null/'Unknown', deriving the label in SQL from `patient_intake_notes` `Service Name` and `parsed_pathology_info->>'procedure_type'`; then propagate to `qa_cases.service_line` for cases joined on `appointment_id` whose `service_line` is null/'Unknown'.
- Verification: re-run the Premier QA queue filter and confirm no "Unknown" rows remain, dates stay blank, and the morning/afternoon preference still renders.
