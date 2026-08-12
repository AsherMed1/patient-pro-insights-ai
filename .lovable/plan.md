# Clean up the "Last contact" tag in the Review Queue

The Pending Review rows show `Last contact 1d 22h ago · 34b460e8-10d4-47fb-812d-f712a6ee4c32`. That trailing string is a raw user ID stored on the note instead of a person's name.

## What changes

- If the note's author is a readable name (e.g. "Anyira R."), keep showing it: `Last contact 1d 22h ago · Anyira R.`
- If the author is stored as a raw ID, look up that person's name and show it instead.
- If no name can be found, show just `Last contact 1d 22h ago` — never the raw ID.
- The hover tooltip follows the same rule.

## Technical notes

- In `src/components/admin/ReviewQueue.tsx`, the last-contact map is built from `appointment_notes.created_by` (around line 627). Add a UUID-shape check on that value.
- Collect the UUID-shaped authors from the loaded notes and batch-resolve them against `profiles` (id → full name/email) in the same fetch pass; cache the lookup in state.
- Render: name when resolved, otherwise drop the `· author` segment entirely. Same for the `title` tooltip at line 1733.
- No schema or backend changes.
