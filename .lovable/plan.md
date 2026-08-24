# Add cancellation reasons and notes to the Excel export

The Export to Excel file currently stops at insurance fields, so the reasons behind a cancellation — which live in the record's notes and in the cancellation reason field — never make it into the file. This adds them.

## New columns (appended after "Date Created")

- **Cancellation Reason** — the reason captured on the record when it was cancelled or marked no-show.
- **Reschedule Eligible** / **Reschedule Block Reason** — only meaningful for no-shows, useful next to the cancellation reason.
- **Notes** — every note on the record combined into one cell, newest first, each line formatted as `MM/DD/YYYY hh:mm AM/PM — Author: note text`.

Layout stays one row per appointment. Column widths get capped so the Notes column doesn't stretch the sheet to an unusable width; the cell wraps instead.

## How notes are gathered

The export already re-queries the database for all filtered rows. It will additionally fetch the notes for those rows in batched lookups (chunked so a large export doesn't exceed request limits) and attach them per record before building the sheet. All notes are included — both clinic-visible and internal.

## Technical detail

- `src/utils/exportAppointmentsToExcel.ts`: accept an optional notes map (`appointmentId -> notes[]`), add the four columns, format the notes cell, cap column widths and enable wrap on Notes.
- `src/components/AllAppointmentsManager.tsx`: after the export query resolves, fetch from `appointment_notes` (`appointment_id, note_text, created_at, created_by, visibility`) using `.in('appointment_id', ids)` in chunks of ~200 ids, ordered newest first, then pass the grouped map into `exportAppointmentsToExcel`.
- No schema or backend changes; read-only additions to an existing export path.
