# Internal notes privacy + service-accurate pathology

## 1. Internal Notes are team-only

Today the Internal Notes block renders for every role (system/blue notes are already admin-only). Clinic users can read every internal note.

Change: hide the entire "Internal Notes" section — list, count and Add Note button — from clinic portal users (`project_user` role). Internal team roles (admin, agent, VA, QA specialist, review_only, recapture) keep it exactly as today. Nothing is deleted; this is visibility only.

Applies everywhere the notes block appears: appointment cards and the detailed appointment view.

## 2. Lead type should follow the service actually booked

Verified on the live data: several Seamless Medical Centers records sit on a "Request Your PAD Consultation at Port Arthur, TX" calendar while their stored pathology still says `procedure_type: PAE` (e.g. Mohsin L). Cause: when GHL moves an appointment to a different calendar/funnel, the webhook accepts the new `calendar_name` but never re-runs parsing, so the pathology object stays frozen on the first funnel's procedure.

Change: when an inbound GHL update changes `calendar_name` to a calendar that maps to a different procedure than the one currently stored in `parsed_pathology_info.procedure_type`:

- clear the parse watermark and re-trigger `auto-parse-intake-notes` for that record;
- drop the previous procedure's pathology fields instead of merging them, so PAE-only fields (BPH, urinary symptoms, urologist) do not survive onto a PAD record;
- log a system note recording the service change (PAE → PAD) for audit.

Calendar name stays the authority for procedure type, per existing policy.

## 3. Capture the funnel fields for the current service

The example record's GHL data contains a full set of `PAD Step 1/2 | ...` fields, yet the portal showed PAE fields and no PAD fields. The GHL field extractor filters custom fields by the target procedure, so with a stale PAE target every PAD field was discarded.

Change:

- derive the extraction target from the calendar-detected procedure first (already the intent) and make sure the re-parse in step 2 passes the new target;
- when the contact has step fields for more than one funnel, prefer the most recently completed funnel matching the booked service, and ignore the older funnel's fields rather than letting them fill the pathology block;
- after re-parse, confirm PAD-specific fields (pain to toes, open wounds, worse when walking, smoking/tobacco, blood thinners, medical conditions, numbness/cold/discoloration) populate.

## 4. Backfill

Re-parse the existing Seamless Medical Centers records whose calendar procedure disagrees with the stored `procedure_type`, so current records display the right service and fields.

## Technical notes

- `src/components/appointments/AppointmentNotes.tsx`: gate the whole component on `!isProjectUser()`; parents (`AppointmentCard.tsx`, `DetailedAppointmentView.tsx`) keep passing props unchanged.
- `supabase/functions/ghl-webhook-handler/index.ts`: in the update path where `calendar_name` is accepted, compare `detectProcedureFromCalendar(new)` against the stored procedure; on mismatch null `parsing_completed_at`, reset `parsed_pathology_info` and call the existing background auto-parse trigger.
- `supabase/functions/auto-parse-intake-notes/index.ts`: ensure `targetProcedure` used by `extractDataFromGHLFields` comes from the calendar procedure, and add newest-funnel preference when multiple `<PROC> STEP` groups exist in the GHL fields.
