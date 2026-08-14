# Fill QA Name from real work, not from who's looking

## What's actually going on

Nothing was wiped. Checking the database: of 4,638 QA records, only 366 have ever had a QA Name saved. Those still display correctly — Genaro Escobar shows Chris Tan, Daniel Damron shows Matthew Pernes, Adriana Cardenas shows Ivy S, and so on.

The other 4,272 have always been blank in the database. They only *looked* filled before because the form printed the name of whoever opened the drawer. So the field appeared populated for everyone, on every record, regardless of who actually did the audit — which is why the same record read "Chris Tan" for Chris and "Johann Alpapara" for you.

Now that the cosmetic auto-fill is gone, you're seeing the true state: most records were never attributed.

## Fix: attribute records to the person who actually worked them

Instead of guessing from the viewer, derive QA Name from real activity on the record.

**Auto-claim on action.** When a specialist takes a real action on a record — moves the workflow status, saves audit details, or posts an internal note — and QA Name is still blank, set it to that person's name automatically. Opening or reading a record still changes nothing.

**One-time backfill of historical records.** For existing records with a blank QA Name, fill it from the record's own history, in this order:
1. The assigned QA specialist, if one is set.
2. The author of the earliest internal note on the record.
3. The actor on the earliest status-change activity entry.
Records with no human activity at all stay blank — they were never worked by anyone.

**Manual override stays.** The field remains editable, with the "Use my name" link for one-click self-attribution.

## Technical notes

- `src/components/admin/QAOperationsQueue.tsx`: in `updateStatus`, `saveAudit`, and `addNote`, include `qa_name: <actor name>` in the update when `caseData.qa_name` is null/blank. Continue to set `assigned_qs_user_id` at the same time.
- Backfill migration over `qa_cases` where `qa_name IS NULL`, resolving in order from `assigned_qs_user_id` → `profiles.full_name`, then earliest `qa_case_notes.author_name`, then earliest `qa_case_activity.actor_user_id` → `profiles.full_name`.
- QA Reports and the Activity Report already fall back to "Unassigned" / "System / Unattributed", so their numbers improve automatically once names are populated.
