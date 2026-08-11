# Fix "Failed to add note" in the Client Portal (Ozark)

## What's happening

Confirmed from the database error logs (multiple hits in the last hour):

```text
null value in column "attachments" of relation "appointment_notes" violates not-null constraint
```

The `appointment_notes.attachments` column is `NOT NULL` with a default of `[]`. When a user saves a note **without** attaching an image, the portal explicitly sends `attachments: null`, which overrides the default and the database rejects the insert. The UI then shows the red "Failed to add note" box.

This affects every clinic and every note saved without an attachment — not just Ozark.

## The fix

1. In the note-saving hook, send an empty array instead of `null` when there are no attachments.
2. Apply the same correction in the ControlHub comment edge function, which has the identical `attachments.length > 0 ? ... : null` pattern and would fail the same way on a text-only reply.
3. Verify by saving a plain text note and a note with an image attached, checking that both persist and no error toast appears.

No database migration is needed — the column default already handles the empty case correctly.

## Also seen in the logs (separate, lower priority)

- `invalid input syntax for type uuid: "Katherine Aquino"` — some write is sending a person's name into a UUID column. It is a different code path from note saving, so it is not what the clinic is hitting. I can trace and fix it in a follow-up.
- One `canceling statement due to statement timeout` — a single slow query, will monitor rather than act on now.

## Technical details

- `src/hooks/useAppointmentNotes.tsx` — `addNote`: replace `attachments.length > 0 ? attachments : null` with `attachments ?? []`.
- `supabase/functions/post-controlhub-comment/index.ts` (line ~186) — same replacement.
