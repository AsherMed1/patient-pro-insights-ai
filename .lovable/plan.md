# Update existing carve-around notes

## Verified issue

The code already uses the clearer wording and marks newly created carve-around notes as internal. The screenshot is an older database note, so changing the code did not rewrite it.

There are **83 existing notes** with the old “routed around” wording. All 83 are still marked `clinic` and use a raw user ID as the displayed author.

## Change

1. Backfill those 83 existing notes to:
   - use the clearer wording about keeping the existing appointment and blocking the remaining available time;
   - set visibility to `internal`;
   - replace the raw UUID author with the staff name already contained in the old note text.
2. Correct the live note writer so future notes store the staff member’s name rather than their user ID.
3. Verify the affected note now displays the new wording, an internal badge, and “Challene Paran” as its author.

## Technical details

- Update the carve-around insert in `ReserveTimeBlockDialog.tsx` from `created_by: userId` to `created_by: userName`.
- Run a targeted database migration/update only for `appointment_notes` rows matching the old carve-around sentence pattern; no schema or RLS changes.
