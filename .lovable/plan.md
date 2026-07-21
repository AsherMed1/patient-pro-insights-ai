## Make Error Category an editable, DB-driven master list

Mirror the pattern already used for Error Source: replace the hardcoded 9-item `ERROR_CATEGORIES` array with a `qa_error_categories` table seeded with the full approved list, and let QAs add new categories via an "Other…" flow that persists to the table.

### Database (migration)

Create `public.qa_error_categories`:
- `id uuid pk default gen_random_uuid()`
- `name text not null unique`
- `is_seeded boolean not null default false`
- `created_by uuid null`
- `created_at timestamptz not null default now()`

Grants + RLS mirroring `qa_error_sources`:
- `GRANT SELECT, INSERT ON public.qa_error_categories TO authenticated;`
- `GRANT ALL ON public.qa_error_categories TO service_role;`
- Enable RLS; authenticated users can SELECT and INSERT (no updates/deletes from client).

Seed with the full 23-item list:

Already present (kept):
Missing Insurance, Notes Added to Portal, Duplicate Appointment, Booking Rule Violation, Uploaded Insurance Card, Name Correction, Double Booked, Incorrect Patient Info

Newly added:
Clinic Notes / DND, Missing Address, Missing DOB, Missing PCP Info, No Email, Not on Portal, Notes Added to GHL, OON / Setter, Portal/GHL Sync Issue, Tech Ticket, Triple Booked, Updated Portal Status, Wrong Location, Wrong Procedure, Missing Secondary Insurance

### Frontend (`src/components/admin/QAOperationsQueue.tsx`)

- Remove the static `ERROR_CATEGORIES` constant.
- Fetch `qa_error_categories` (ordered alphabetically) into state, refreshed the same way `qa_error_sources` is loaded on mount.
- Replace the Error Category `<Select>` with a new `ErrorCategoryField` component modeled on `ErrorSourceField`:
  - Renders master-list options + a permanent `Other…` entry.
  - Selecting `Other…` reveals an inline text input + Add button that inserts into `qa_error_categories` (with case-insensitive duplicate guard and `23505` handling), refreshes the list, and selects the new value.
  - If a case already carries a legacy value not in the master list, the field still shows it as selected (same fallback behavior as `ErrorSourceField`).
- No changes to `qa_cases` — `error_category` remains a free-text column, so historical rows and any custom entries continue to work.

### Out of scope

- No admin CRUD screen for renaming/deactivating categories (deferred, same as with `qa_error_sources`).
- No changes to Resolution Type, Error Source, or any other QA fields.