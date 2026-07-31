# Angela Young (Horizon) — no calendar, missing from GAE filter

## What I found

Record `d2fe5c89` (Angela Young, Horizon Vascular Specialists):

- `calendar_name` = `Unknown`
- `parsed_pathology_info.procedure_type` = null (and no `procedure` key)
- No `ghl_appointment_id`, no date — Horizon is an unscheduled-capture project, so GHL sends a contact-only payload with no calendar object. The webhook handler falls back to `'Unknown'`.

The GAE filter matches on `procedure_type = 'GAE'`, or (when `procedure_type` is null) a calendar name containing "GAE"/"In-person". Angela fails both, so she is excluded.

Note: the intake payload DOES carry the calendar — `Calendar ID: PpBNj2YGXka8PP5drkNE` and `Location Picker: Germantown` — plus full `GAE STEP 1/2` pathology. The parser produced a nearly empty pathology object (only `imaging_done`), so `procedure_type` never got set. Of 41 Horizon rows, 38 have `calendar_name='Unknown'` but only this one has a null `procedure_type` — the parse is the outlier, the missing calendar name is systemic.

Separately, the "No calendars available" dropdown is the live GHL calendar list for location `Wv6kylvdxrV4w87fBInd`. The project has a `pit-` API key configured; whether GHL returns calendars for it still needs a live check.

## Fix

1. **Re-parse Angela's record** so `parsed_pathology_info.procedure_type = 'GAE'` and the rest of the GAE STEP 1/2 fields (side: Both, duration: Over 1 year, pain level 5, trauma: YES, treatments: Physical therapy, symptoms: Instability or weakness) populate. She then appears under the GAE filter immediately.

2. **Backfill calendar name for unscheduled Horizon rows.** In `ghl-webhook-handler`, when there is no calendar object on the payload, read the `Calendar ID` custom field (and `Location Picker`) out of the GHL contact data and resolve it to the real calendar name via the project's GHL calendar list, instead of writing `'Unknown'`. Apply the same resolution as a one-time backfill for the 38 existing Horizon rows.

3. **Harden the parser guard** so a pathology object that comes back with every field null but with `GAE STEP`/`UFE`/`PAE` markers present in the source notes is treated as a failed parse and retried, rather than saved as-is.

4. **Diagnose the empty calendar dropdown**: call `get-ghl-calendars` with the Horizon project key. If GHL returns calendars, the UI path is at fault; if it returns none or errors, the project's GHL token/permissions need updating and I will report exactly what GHL said. Also note that for unscheduled rows there is no `ghl_appointment_id`, so "transfer to calendar" cannot write back to GHL — the selection would only set the portal's calendar/location. I'll confirm the desired behavior there once the diagnosis is in.

## Technical notes

- Files: `supabase/functions/ghl-webhook-handler/index.ts` (calendar fallback at lines ~872/932/955), `supabase/functions/auto-parse-intake-notes/index.ts` (empty-parse guard), plus a one-off backfill script.
- No change to the GAE filter query itself in `AllAppointmentsManager.tsx` — it is correct; the data feeding it was wrong.
