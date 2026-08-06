# Schema doc for booked / showed / procedures-ordered reporting

Create a single markdown reference the outside developer can use without any database credentials. No app behavior changes.

## Deliverable

New file: `docs/reporting-schema.md`

## What it will contain

### How clients are identified
Clients are identified by the text column `project_name`, present on every reporting table (`all_appointments`, `new_leads`, `all_calls`) and defined in `projects.project_name` (with `active`, `timezone`, `ghl_location_id`). There is no numeric client ID — joins are by name string. Exclude `PPM - Test Account` from all reporting.

### Core table: `all_appointments`
Documented columns grouped as:
- Identity: `id`, `project_name`, `lead_name`, `lead_email`, `lead_phone_number`, `dob`, `ghl_id`, `ghl_appointment_id`
- Dates: `date_appointment_created` (lead/booking creation), `date_of_appointment` + `requested_time` (the visit), `created_at` / `updated_at`
- Outcome: `status`, `procedure_ordered` (bool), `procedure_status`, `internal_process_complete`, `was_ever_confirmed`, `cancellation_reason`
- Row hygiene flags: `is_reserved_block`, `is_superseded`, `review_status`, `is_unscheduled`

### Live value dictionaries (from actual data)
- `status` is free text with casing drift — real values include `Showed`/`showed`, `Cancelled`/`cancelled`, `No Show`/`noshow`, `Confirmed`/`confirmed`, `OON`, `Do Not Call`, `Welcome Call`, `Scheduled`, `Pending`, `Rescheduled`, `Won`, `new`. Always compare with `lower(trim(status))`.
- `procedure_status`: `ordered`, `no_procedure`, `imaging_ordered`, `not_covered`, `pending_test_results`, `pending_insurance_auth`, `procedure_complete`, or null.
- `review_status`: `approved`, `pending`, `declined`, `oon`, `dismissed`.

### Mandatory row filters
Every metric query must exclude non-real rows:
```sql
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false) = false
  and coalesce(review_status, 'approved') = 'approved'
```

### Metric definitions (ready-to-run SQL)
- **Booked** — one row per real appointment. Count by `date_appointment_created` for pipeline volume, or by `date_of_appointment` for visit volume; the doc will state which to pick and why.
- **Showed** — `lower(status) = 'showed'`.
- **Procedures ordered** — `procedure_status = 'ordered'` as the current source of truth, with a note that the legacy boolean `procedure_ordered` predates it and can disagree on older rows.
- **Show rate** — showed / booked over the same date basis.
- A combined per-client, per-month rollup query.

### Supporting tables
- `new_leads` — pre-appointment leads (`date`, `appt_date`, `status`, `procedure_ordered`, `times_called`, `contact_id`).
- `all_calls` — call activity (`call_datetime`, `direction`, `status`, `duration_seconds`, `agent`).
- `projects` — client roster, `active` flag, `timezone`.

### Access note
Data is reachable read-only via the Supabase REST API using the project URL and the publishable anon key (both already public in the frontend); RLS applies. Direct Postgres access, if needed, requires a read-only role created in the Supabase SQL editor — the doc will include that SQL, without any password.

## Technical notes
- Documentation only; no schema migration, no code changes.
- Value dictionaries above were read from live data, so counts/casing reflect the current database.
