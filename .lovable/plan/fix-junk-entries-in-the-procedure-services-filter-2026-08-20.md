# Fix junk entries in the Procedure/Services filter

## What's wrong

The Services dropdown is built straight from `parsed_pathology_info->>procedure_type` on appointment rows, so any single mis-parsed record adds a permanent option. Confirmed in the data:

- Elite Minimally Invasive Specialists: `Procedure` (1 row), `FSE` (1), `HAE` (1), `FNA` (2) — all one-off misparses against 10 real PAE rows.
- Joint & Vascular Institute: `TKR` (1 row) among GAE/HAE/FSE/PFE/PAD/UFE/ATE/TAE.
- Naadi Healthcare: literal string `"null"` (1 row).
- NG Vascular and Vein Center: `TKR` (1 row) and `PAE w/BPH` (31 rows, a variant of PAE).

A second, related problem: the options query reads `all_appointments` with no paging, so PostgREST caps it at 1000 rows. For large clinics the dropdown is derived from an arbitrary 1000-row slice rather than the full set.

## The fix (display layer only)

In `src/components/appointments/AppointmentFilters.tsx`:

1. **Sanitize values** — drop non-service tokens before adding to the set: empty/whitespace, `null`, `none`, `n/a`, `na`, `unknown`, `tbd`, `other`, `procedure`, `consultation`, `appointment`, plus anything longer than ~30 chars or containing URLs/newlines.
2. **Normalize aliases** — collapse variants onto their canonical service so they stop appearing as separate rows: `PAE w/BPH`, `PAE w BPH`, `PAE with BPH` → `PAE`; `UAE` → `UFE`; trim/upper-case acronyms consistently. Keep word-style names (Neuropathy, Vein) as-is.
3. **Suppress one-off noise** — require a service to appear on at least 2 appointments for the clinic before it is listed. This removes `TKR`, Elite's stray `FSE`/`HAE`/`Procedure` and Naadi's `null`, while keeping legitimate low-volume lines (Naadi Neuropathy 79, JVI TAE 18, ATE 20). The currently selected service and any entry in `KNOWN_PROJECT_SERVICES` are always kept, so an active filter chip never disappears.
4. **Read the full set** — page the options query in 1000-row batches (or restrict columns and loop with `.range()`) so the dropdown reflects every appointment for the clinic, not just the first page.

Locations dropdown behavior, the date-range scoping, and the active/inactive dimming stay exactly as they are.

## Not included

This is a display fix; it does not rewrite the underlying mis-parsed rows. If you also want the ~6 bad `parsed_pathology_info` values corrected in the database (e.g. the `"null"` row and the `TKR` rows), say so and that can be a follow-up cleanup.

## Files touched

- `src/components/appointments/AppointmentFilters.tsx`
