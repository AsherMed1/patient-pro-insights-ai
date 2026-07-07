I’m sorry — you’re right to be upset. I found the unsafe part: the normal appointment webhook still runs `enrichAppointmentWithGHLData`, and that appends a full `=== GHL Contact Data (Full) ===` block into `patient_intake_notes` every time. The new notes-only branch did not catch this latest payload, so the old enrichment path kept appending instead of updating the portal Notes field.

Plan:

1. Stop the duplicate Patient Intake Notes appends
   - Change `enrichAppointmentWithGHLData` so it no longer blindly appends another full GHL contact block on every webhook.
   - Make it replace the existing `=== GHL Contact Data (Full) ===` section or skip rewriting it if the contact snapshot already exists.
   - This prevents repeated blocks from being added again.

2. Make the notes-only workflow impossible to fall through
   - Strengthen the early `contact_notes_only` guard so any payload with `sync_type: "contact_notes_only"` exits before appointment update/enrichment logic.
   - If required fields are missing, return a safe 200 response with `updated: 0` instead of falling into appointment update logic.
   - Only update `parsed_medical_info.notes`; no appointment date, status, intake notes, insurance, or contact fields.

3. Fix the actual Notes field target
   - Update the notes sync branch to write the GHL Notes value into the field the portal displays as Medical Information → Notes.
   - Preserve existing `parsed_medical_info` data and only change the `notes` key.

4. Repair Test Johann Booked safely
   - Clean the Georgia Endovascular `Test Johann Booked` record by removing duplicate appended `=== GHL Contact Data (Full) ===` blocks from `patient_intake_notes`.
   - Set Medical Information → Notes to the latest intended note value from GHL: `test note - update 2 with workflow triggered`.
   - Do not change appointment status/date/time/insurance/contact fields.

5. Validate before saying it is fixed
   - Check edge logs for the next webhook to confirm response branch is `contact_notes_sync`.
   - Query the database for that appointment and confirm:
     - `patient_intake_notes` is not growing with duplicate GHL blocks
     - `parsed_medical_info.notes` contains the GHL note
     - status/date/time are unchanged