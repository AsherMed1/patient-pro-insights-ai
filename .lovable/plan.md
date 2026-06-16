
## Problem

Dean asked whether Phone and DOB search work alongside the new Email search. They are wired into the UI but both have bugs:

- **DOB**: every query uses `.ilike('dob::text', ...)` against `all_appointments.dob` (a `date` column). PostgREST treats `dob::text` as a literal column name, so the filter throws / returns nothing.
- **Phone**: input is digit-stripped then matched as `%XXX%YYY%ZZZZ%` against `lead_phone_number`. Stored values without separators (e.g. `4794148840`, `+14794148840`) won't match because the literal `%` between groups still needs intermediate characters in many rows, and partial searches (e.g. last 4 digits) are not supported.

Both bugs are reproduced in 4 places inside `src/components/AllAppointmentsManager.tsx`: count query (~248), main list query (~404), legacy list query (~560), and the export query (~1560).

## Fix

### DOB search
Accept several user-friendly inputs and translate them to a proper date filter on the `date` column:

- Full date `YYYY-MM-DD` or `MM/DD/YYYY` → `.eq('dob', isoDate)`
- Year only `YYYY` → range filter: `.gte('dob','YYYY-01-01').lte('dob','YYYY-12-31')`
- Month+day `MM/DD` or `MM-DD` → use a Postgres expression via `or(`+ `and(`-style filters across all years won't work cleanly in PostgREST; we'll instead require either a year or a full date and show a hint in the input placeholder.
- Otherwise: no-op (return empty) and show placeholder text "YYYY-MM-DD or MM/DD/YYYY".

Helper `buildDobFilter(searchTerm, query)` returns the mutated query so all four call sites share one implementation.

### Phone search
- Strip non-digits from input.
- Strip non-digits from stored `lead_phone_number` at query time by adding a Postgres-side filter using `or()` on a regex-normalized comparison. PostgREST supports `like` only on raw text, so the simplest reliable approach is: keep the digit-stripped input and match with a plain `%digits%` ilike against `lead_phone_number` AFTER ALSO trying a "spaced" variant. In practice, the cleanest, robust fix is server-side: add a generated column `lead_phone_digits text GENERATED ALWAYS AS (regexp_replace(coalesce(lead_phone_number,''), '\D','','g')) STORED` and an index on it, then filter `.ilike('lead_phone_digits', '%digits%')`.
- This supports partial searches (any contiguous digit substring, including last-4) and any stored format.

### Placeholder & label polish
Update `AppointmentFilters.tsx` placeholder copy:
- Phone → "Search phone (any digits)…"
- DOB → "YYYY-MM-DD or MM/DD/YYYY"

## Technical details

Files:
- `src/components/AllAppointmentsManager.tsx` — replace 4 search blocks with calls to two helpers (`applyPhoneFilter`, `applyDobFilter`) defined at the top of the file or in a new `src/utils/appointmentSearchFilters.ts`.
- `src/components/appointments/AppointmentFilters.tsx` — update placeholders.
- New migration: add generated column + index on `all_appointments`:
  ```sql
  ALTER TABLE public.all_appointments
    ADD COLUMN lead_phone_digits text
    GENERATED ALWAYS AS (regexp_replace(coalesce(lead_phone_number,''), '\D', '', 'g')) STORED;
  CREATE INDEX IF NOT EXISTS idx_all_appointments_lead_phone_digits
    ON public.all_appointments (lead_phone_digits);
  ```
  No new RLS / grants needed — generated column inherits table policies. Types regenerate automatically.

Verification:
- Run targeted reads against `all_appointments` after migration to confirm Thomas L Fite's number `(479) 414-8840` is findable by `4148840`, `4148`, and `+14794148840` searches.
- Confirm DOB `1944-08-30` is findable via both `1944-08-30` and `08/30/1944`.

## Out of scope

- Email search behavior (already shipping per Luis).
- Search inside Review Queue / Calendar views (these use different components).
