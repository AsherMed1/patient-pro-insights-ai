## No changes needed — feature is already in place

The "Use a controlled Error Source list" request is already implemented. Verified today against the live database and `src/components/admin/QAOperationsQueue.tsx`:

**Master list drives the dropdown**
- The Error Source field (`ErrorSourceField`, lines ~990–1087 in `QAOperationsQueue.tsx`) reads exclusively from the `qa_error_sources` table via `supabase.from('qa_error_sources')`.
- It does not read from `profiles`, `user_roles`, or any account-based source, so setters and non-person sources without user accounts are supported equally.

**All 8 required non-person entries are seeded**
Confirmed present in `qa_error_sources`:
- Workflow
- AI Ashley
- AI Grace
- AI Mark
- Clinic Error
- Clinic Update
- Patient Update
- Portal Error

Alongside the 28 setter names from your earlier curated list (36 rows total).

**"Other…" remains available**
- The dropdown includes a permanent `Other…` option.
- Selecting it opens an inline text field; on save, the new name is inserted into `qa_error_sources` (with a duplicate check that guards against case-insensitive collisions and the DB unique constraint), then immediately becomes selectable for everyone going forward.

**Per your answer**, the master list stays as-is (non-person entries + setter names + Other…), so no code or data change is required for this request. If a specific entry ever needs to be renamed or hidden, that can be handled as a separate small task (an admin management UI or a one-off data update).