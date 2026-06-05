# Fix: Davis "GAE" service filter returns 0 results

## Root cause

The service filter on the appointments list matches rows where either:
- `calendar_name ILIKE '%GAE%'` (or `%In-person%`), OR
- `parsed_pathology_info ->> 'procedure' = 'GAE'`

All 200 Davis Vein & Vascular appointments currently have `parsed_pathology_info->procedure = NULL`, and 30 of them (the newly imported unscheduled leads) also have `calendar_name = NULL`. So selecting "GAE" in the service filter matches 0 rows — even though the appointment card visually shows a "GAE" tag (the card falls back to keyword‑matching `patient_intake_notes` like "knee pain" / "osteoarthritis", which the database filter does not do).

Davis Vein & Vascular is a GAE-only project (same pattern as Premier Vascular / ECCO Medical), so every Davis appointment should carry `procedure = 'GAE'`.

## Fix

One-time data backfill on `public.all_appointments` for `project_name = 'Davis Vein & Vascular'`:

- Set `parsed_pathology_info` to `jsonb_set(coalesce(parsed_pathology_info, '{}'::jsonb), '{procedure}', '"GAE"')` for every Davis row where the procedure key is missing or null.
- Leaves all other parsed fields intact.

After the backfill:
- Selecting "GAE" in the service filter will return all Davis appointments (matched via `parsed_pathology_info->>procedure = 'GAE'`).
- The "All Services" count and the "GAE" count will agree (both 2 inside the Jun 1–30 window, 200 overall).

No frontend changes are needed — the existing filter logic in `AllAppointmentsManager.tsx` already handles `parsed_pathology_info->>procedure = 'GAE'`.

## Follow-up (optional, not in this change)

To prevent recurrence on future Davis (and Premier / ECCO) unscheduled-lead imports, the lead-insert path for these GAE-only projects should default `parsed_pathology_info = {"procedure": "GAE"}` at insert time. Confirm before I add this.
