## Issue
ECCO Medical's brand-new unscheduled-capture leads (Premier-style, no date/time, only a `time_preference`) come into the database as `status='Pending'` + `is_unscheduled=true`. The client-portal "New" / "Needs Review" tab queries in `AllAppointmentsManager.tsx` only check `status`, so every Pending row — including freshly captured ECCO leads — gets pushed to **Needs Review** instead of **New**.

The in-memory filter in `src/components/appointments/utils.ts` already handles this correctly (it treats `is_unscheduled === true` Pending rows as "new"), but the Supabase queries that paginate and count tabs don't mirror that rule.

## Fix
Update the four tab-filter query blocks in `src/components/AllAppointmentsManager.tsx` (lines ~302, ~437, ~595, ~1548) so unscheduled-capture leads route to **New**, not **Needs Review**:

- **New tab query** — currently `.not('status','ilike','pending')`. Replace the blanket exclusion with PostgREST `or()`:
  `or('status.not.ilike.pending,is_unscheduled.eq.true')`
  This keeps regular Pending rows out of New, but lets Pending + `is_unscheduled=true` (ECCO/Premier/Davis) appear in New.

- **Needs Review tab query** — currently `or('status.ilike.pending,date_of_appointment.lt.<today>,and(date_of_appointment.is.null,or(is_unscheduled.is.null,is_unscheduled.is.false))')`. Tighten the `pending` branch to exclude unscheduled leads:
  `or('and(status.ilike.pending,or(is_unscheduled.is.null,is_unscheduled.eq.false)),date_of_appointment.lt.<today>,and(date_of_appointment.is.null,or(is_unscheduled.is.null,is_unscheduled.is.false))')`

Apply to all four occurrences (count query, data query, per-tab count fan-out, Excel-export query) so the badge counts, the list, and the export all stay consistent.

## Scope
- No DB schema, edge function, or webhook changes — ingestion already sets `is_unscheduled=true` correctly for ECCO/Premier/Davis.
- No effect on non-unscheduled projects: regular Pending rows still route to Needs Review.
- Applies retroactively (existing ECCO Pending unscheduled rows will jump from Needs Review → New on next page load) and to all future captures.

## Verification
After the change, query the ECCO rows shown above (e.g. Henry Makowiecki, Diana Kimbrel, Ken Johnson, Tracie Stump) and confirm they appear under the **New** tab; confirm a non-ECCO Pending row still shows under **Needs Review**.
