## Goal
Replace the QA Operations "Error Source" dropdown (currently pulled from `review_only` setters) with a curated, persistent list. Support an "Other" option that lets QAs add new sources on the fly, with duplicate validation.

## Changes

### 1. Database — new table `qa_error_sources`
- Columns: `name` (text, unique, case-insensitive), `is_seeded` (bool), `created_by` (uuid), plus standard id/timestamps.
- Seed with the 36 provided names (AI Ashley … Yeimy Roa). "Other" is NOT stored — it's a UI-only sentinel.
- Grants: SELECT/INSERT for `authenticated`, ALL for `service_role`.
- RLS: any authenticated user can read; only admin/agent/qa_specialist can insert.
- Unique index on `LOWER(TRIM(name))` to enforce case-insensitive dedup.

### 2. UI — `src/components/admin/QAOperationsQueue.tsx`
- Drop the current setter-fetching logic for Error Source (keep setters for anywhere else that needs them — they are not referenced elsewhere here, so remove).
- Fetch `qa_error_sources` ordered by name, plus append an "Other" entry at the bottom.
- When user picks "Other":
  - Show an inline text input + Add button.
  - On Add: trim input, reject empty, check against the loaded list case-insensitively. If it matches, show validation error "'X' already exists in the list — please select it instead" and do NOT insert.
  - Otherwise insert into `qa_error_sources`, refresh the list, and auto-select the new value.
- Selected value persists to `qa_cases.error_source` as plain text (schema unchanged).

### 3. Backfill / migration
- Existing `qa_cases.error_source` values remain as-is (free text). No data migration required.

## Out of scope
- No admin UI for editing/deleting sources (can be added later).
- No renaming of existing free-text values in older cases.

## Technical notes
- Case-insensitive dedup via `create unique index on qa_error_sources (lower(trim(name)))`.
- Seed via `insert ... on conflict do nothing` so re-running is safe.
- "Other" sentinel handled purely in React state — never written to DB as a source name.
