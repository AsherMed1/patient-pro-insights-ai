## Goal
When the GHL "Sync Contact Notes → Portal" workflow fires, update **only** `parsed_medical_info.notes` (the Notes field under Medical Information). Do not add anything to Internal Notes.

## Change
In `supabase/functions/ghl-webhook-handler/index.ts`, inside `tryContactNotesSync` (lines ~2052–2077):

- Keep the `parsed_medical_info` merge/update that writes `notes: trimmed`.
- **Remove** the `appointment_notes` insert that writes `"Medical Notes updated from GHL: …"`.

No other branches are touched. The two notes you saw ("Status changed…" and "Rescheduled | FROM…") come from the appointment-webhook path, not from `tryContactNotesSync` — so if those appear again, that means GHL is also firing an appointment webhook alongside the notes workflow, which is a separate issue to investigate.

## Validation
1. Deploy the edge function.
2. Trigger the GHL Notes workflow on a test contact.
3. Confirm in DB: `parsed_medical_info.notes` updated, `appointment_notes` has no new "Medical Notes updated from GHL" row.
4. Confirm in the portal UI: Medical Information → Notes shows new value; Internal Notes count unchanged.
