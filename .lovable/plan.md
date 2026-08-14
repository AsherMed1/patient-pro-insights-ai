# QA Name: keep the blank-by-default behavior

## Findings

Verified directly against the database — no data was lost:

- Steven Cruz's two QA records have never had a QA Name saved (`qa_name` is empty on both), and no other audit field was ever saved on them. The "Chris Tan" in the earlier screenshot was the old auto-fill showing whoever had the drawer open, not stored data.
- All previously saved names are intact: Ivy S (198 records), Giselle M (59), Matthew Pernes (50), Jenny S (25), Chris Tan (21), Dean Lunderstedt (7), and a few others. Those still display exactly as before.

## Decision

Keep the current behavior: QA Name starts blank on records with no saved name, with a "Use my name" link to fill it in one click. Saved names always display for everyone.

No further code or database changes required.
