# Fix QA Name auto-filling with the viewer's name

## What you saw

You saw it right, but nothing was overwritten. For Steven Cruz's QA record the stored QA Name is empty in the database — it was never saved as Chris Tan.

The Audit Details form pre-fills the QA Name box with the profile name of whoever opens the drawer. So Chris saw "Chris Tan" and you see "Johann Alpapara" on the exact same, still-blank record.

The real risk: if anyone opens a record and saves any other audit field, that pre-filled name gets written in permanently — silently crediting the wrong person for the audit.

## Change

- Stop pre-filling QA Name with the current user. Show an empty field with a placeholder ("Enter QA specialist name") when no name has been saved.
- Once a QA Name is saved, always show the saved value regardless of who opens the record.
- Add a quick "Use my name" affordance next to the field so a specialist claiming the audit can fill it in one click, deliberately.
- On save, only write a QA Name that is actually in the field; never write a name the user never typed or clicked.

## Technical notes

- `src/components/admin/QAOperationsQueue.tsx`: `auditFromCase()` currently does `qa_name: c.qa_name ?? (defaultName || '')`. Drop the `defaultName` fallback so it resolves to `c.qa_name ?? ''`, and remove the `defaultName` argument at the three call sites (initial seed, external-update sync, `loadLatestAudit`). `authorDisplayName` stays for note authorship and the "Use my name" button.
- The "Clear Audit Results" path (currently sets `qa_name: authorDisplayName`) should clear to an empty string instead.
- No database or schema changes; existing saved `qa_name` values are untouched.
