# Edit & Delete QA Operations Notes

Let note authors correct typos or remove a note posted by mistake, directly on the QA Operations patient record.

## Behaviour

- Each note in the record's Notes list gets small Edit and Delete actions.
- Edit opens the note text inline (same @mention-capable editor used to post it), with Save / Cancel. Saved notes show an "edited" marker with the edit time.
- Delete asks for confirmation ("This can't be undone") before removing the note.
- Actions appear only on notes the current user wrote; admins can edit or delete any note on a case they can access.
- Deleting or editing a note refreshes the Notes list and the "latest note" preview shown in the Escalation worklist.
- New @mentions added during an edit notify the newly tagged teammates; existing mentions are not re-notified.
- Edits and deletions are recorded in the case activity timeline (e.g. "Note edited by Jane", "Note deleted by Jane") so the audit trail stays intact.

## Technical notes

- `qa_case_notes` already has row-level update and delete rules limited to the note's author. A migration will add an `edited_at` timestamp column and widen the update/delete rules to also allow admins.
- UI work lives in `src/components/admin/QAOperationsQueue.tsx` (notes list + `addNote` area): add `editingNoteId` / `editingText` state, `saveNoteEdit` and `deleteNote` handlers, an inline `MentionTextarea`, and an AlertDialog confirmation, mirroring the existing pattern in `src/components/appointments/AppointmentNotes.tsx`.
- Activity entries written to `qa_case_activity` on edit and delete.
