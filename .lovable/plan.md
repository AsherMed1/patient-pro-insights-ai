## Plan

1. **Harden notes-only detection in `ghl-webhook-handler`**
   - Treat payloads as notes-only when `sync_type: contact_notes_only` appears anywhere common GHL workflows may send it, not only at the root.
   - Also detect note-only payloads from the GHL Notes custom field when there is no real appointment ID/date/calendar context.

2. **Move the no-create guard earlier**
   - Before project creation, appointment matching, and Review Queue insertion, detect notes-only payloads and route them only through the safe notes-sync branch.
   - If no existing portal appointment exists for the contact/project, return a safe skipped response instead of creating a new `all_appointments` row.

3. **Restrict what notes-only sync updates**
   - Keep the current behavior: update only `parsed_medical_info.notes` on eligible existing, non-terminal, non-superseded appointments.
   - Do not update patient intake, status, date/time, insurance, Review Queue, or create internal appointment notes from this workflow.

4. **Clean up the test duplicate**
   - Delete the declined test row for **Test Johann New Fix** (`4c3188e1-234c-4fe5-86c0-133e90f27bb0`) since it was created by the same notes-only issue.

5. **Validate**
   - Test the deployed edge function with a notes-only payload for a contact that has no appointment and confirm it returns `no_matching_appointments` / skipped without inserting a Review Queue row.
   - Test a notes-only payload for an existing appointment and confirm only Medical Information → Notes changes.