# Reporting Schema Reference

Read-only reference for pulling **booked**, **showed**, and **procedures-ordered** metrics out of the PatientPro Portal database. No database credentials are required to use this document.

---

## 1. How clients are identified

There is **no numeric client ID**. Clients are identified by the text column `project_name`, which appears on every reporting table:

| Table | Client column |
| --- | --- |
| `all_appointments` | `project_name` |
| `new_leads` | `project_name` |
| `all_calls` | `project_name` |
| `projects` | `project_name` (the canonical roster) |

Joins between tables are **by name string**, not by foreign key.

`projects` is the client roster:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Not referenced by the reporting tables |
| `project_name` | text | Canonical client name |
| `active` | boolean | Whether the client is live |
| `timezone` | text | IANA timezone; use for any local-time bucketing |
| `ghl_location_id` | text | GoHighLevel sub-account ID |
| `short_notice_threshold_hours` | integer | Per-client scheduling threshold |

> **Always exclude `PPM - Test Account`** — it is an internal demo client and is excluded from every in-app report.

---

## 2. Core table: `all_appointments`

One row per appointment. This is the source of truth for booked / showed / procedures-ordered.

### Identity
| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key ("portal ID") |
| `project_name` | text | Client — see above |
| `lead_name` | text | Patient name |
| `lead_email` | text | |
| `lead_phone_number` | text | |
| `dob` | date | Primary source of truth for date of birth |
| `ghl_id` | text | GoHighLevel **contact** ID |
| `ghl_appointment_id` | text | GoHighLevel **appointment** ID |

### Dates
| Column | Type | Notes |
| --- | --- | --- |
| `date_appointment_created` | date | When the appointment was booked (pipeline date) |
| `date_of_appointment` | date | The visit date. **Nullable** — some clinics capture leads without a date |
| `requested_time` | time | Visit time, paired with `date_of_appointment` |
| `created_at` / `updated_at` | timestamptz | Row audit timestamps |

### Outcome
| Column | Type | Notes |
| --- | --- | --- |
| `status` | text | Free text, see value dictionary below |
| `procedure_status` | text | Current source of truth for procedure outcome |
| `procedure_ordered` | boolean | **Legacy**; predates `procedure_status` and can disagree on older rows |
| `internal_process_complete` | boolean | Clinic-side workflow completion (EMR entry) |
| `was_ever_confirmed` | boolean | Sticky flag, true once the appointment reached Confirmed |
| `cancellation_reason` | text | Populated on cancellation |

### Row hygiene flags (critical for correct counts)
| Column | Type | Notes |
| --- | --- | --- |
| `is_reserved_block` | boolean | `true` = a blocked-off calendar slot, **not a patient** |
| `is_superseded` | boolean | `true` = retired duplicate/older version of a rebooked appointment |
| `review_status` | text | Admin review queue state; only `approved` rows are client-visible |
| `is_unscheduled` | boolean | Lead captured with a time preference instead of a date/time |

---

## 3. Value dictionaries (read from live data)

### `status` — free text with casing drift
`Showed` / `showed`, `Cancelled` / `cancelled`, `No Show` / `noshow`, `Confirmed` / `confirmed`, `OON`, `Do Not Call`, `Welcome Call`, `Scheduled`, `Pending`, `Rescheduled`, `Won`, `new`.

**Always compare with `lower(trim(status))`.** Matching on the raw value will silently drop thousands of rows.

Terminal statuses (appointment is finished, no further movement expected): `Cancelled`, `No Show`, `Showed`, `Won`, `OON`, `Do Not Call`, `Rescheduled`.

### `procedure_status`
`ordered`, `no_procedure`, `imaging_ordered`, `not_covered`, `pending_test_results`, `pending_insurance_auth`, `procedure_complete`, or `NULL` (not yet dispositioned).

### `review_status`
`approved`, `pending`, `declined`, `oon`, `dismissed`.

---

## 4. Mandatory row filters

Every metric query must exclude non-real rows. Use this predicate verbatim:

```sql
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false)     = false
  and coalesce(review_status, 'approved') = 'approved'
```

Why each one matters:
- `is_reserved_block` rows are calendar blackouts, not patients.
- `is_superseded` rows are retired duplicates — counting them double-counts rebooked patients.
- Non-`approved` `review_status` rows are pending/declined/out-of-network records that never became client-facing.

---

## 5. Metric definitions

### Choosing a date basis
Two valid bases; pick one and stay consistent within a report:
- **`date_appointment_created`** — pipeline/marketing volume: how many appointments were *booked* in the period. Use this for lead-gen and cost-per-appointment reporting.
- **`date_of_appointment`** — clinic capacity: how many visits *occurred* in the period. Use this for show-rate and procedure reporting, since the outcome belongs to the visit date.

Show rate should use `date_of_appointment` so numerator and denominator describe the same visits.

### Booked

```sql
select count(*) as booked
from all_appointments
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false)     = false
  and coalesce(review_status, 'approved') = 'approved'
  and date_of_appointment between :from and :to;
```

### Showed

```sql
select count(*) as showed
from all_appointments
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false)     = false
  and coalesce(review_status, 'approved') = 'approved'
  and date_of_appointment between :from and :to
  and lower(trim(status)) = 'showed';
```

### Procedures ordered

```sql
select count(*) as procedures_ordered
from all_appointments
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false)     = false
  and coalesce(review_status, 'approved') = 'approved'
  and date_of_appointment between :from and :to
  and procedure_status = 'ordered';
```

If you also want procedures that have since been performed, include `procedure_complete`:
`and procedure_status in ('ordered', 'procedure_complete')`.

Do **not** use the boolean `procedure_ordered` for new reporting — it is legacy and disagrees with `procedure_status` on older rows.

### Per-client, per-month rollup

```sql
select
  project_name,
  date_trunc('month', date_of_appointment)::date        as month,
  count(*)                                               as booked,
  count(*) filter (where lower(trim(status)) = 'showed') as showed,
  count(*) filter (where procedure_status = 'ordered')   as procedures_ordered,
  round(
    100.0 * count(*) filter (where lower(trim(status)) = 'showed')
    / nullif(count(*), 0)
  , 1)                                                   as show_rate_pct
from all_appointments
where project_name <> 'PPM - Test Account'
  and coalesce(is_reserved_block, false) = false
  and coalesce(is_superseded, false)     = false
  and coalesce(review_status, 'approved') = 'approved'
  and date_of_appointment >= :from
  and date_of_appointment <  :to
group by 1, 2
order by 1, 2;
```

Add `and date_of_appointment is not null` if you are counting unscheduled captures separately.

---

## 6. Supporting tables

### `new_leads` — pre-appointment leads
| Column | Type | Notes |
| --- | --- | --- |
| `date` | date | Lead creation date |
| `project_name` | text | Client |
| `lead_name`, `first_name`, `last_name` | text | |
| `phone_number`, `email`, `dob` | text/date | |
| `appt_date` | date | Set once the lead books |
| `status` | text | Lead-stage status |
| `procedure_ordered` | boolean | Legacy mirror |
| `times_called` | integer | Outreach attempts |
| `contact_id` | text | GoHighLevel contact ID |
| `insurance_provider`, `insurance_plan`, `insurance_id`, `group_number` | text | |
| `calendar_location` | text | |

### `all_calls` — call activity
| Column | Type | Notes |
| --- | --- | --- |
| `call_datetime` | timestamptz | |
| `project_name` | text | Client |
| `lead_name`, `lead_phone_number` | text | |
| `direction` | text | inbound / outbound |
| `status` | text | Call disposition |
| `duration_seconds` | integer | |
| `agent` | text | |
| `recording_url`, `call_summary` | text | |
| `ghl_id` | text | GoHighLevel call ID |

---

## 7. Access

**Preferred — Supabase REST API (read-only, no new credentials).**
The project URL and publishable anon key already ship in the frontend bundle and are safe to share. Row Level Security applies, so results are scoped to what the authenticated role may read.

```
GET https://bhabbokbhnqioykjimix.supabase.co/rest/v1/all_appointments
    ?select=project_name,date_of_appointment,status,procedure_status
    &project_name=neq.PPM%20-%20Test%20Account
    &is_superseded=eq.false
apikey: <publishable anon key>
```

**Direct Postgres access.** The connection URI embeds the database password and is not shared. If a client needs direct SQL, create a dedicated read-only role in the Supabase SQL editor (the password is chosen by whoever runs this — never commit it):

```sql
create role reporting_ro login password '<choose-a-strong-password>';
grant connect on database postgres to reporting_ro;
grant usage on schema public to reporting_ro;
grant select on public.all_appointments, public.new_leads,
                 public.all_calls, public.projects to reporting_ro;
alter default privileges in schema public grant select on tables to reporting_ro;
```

Then connect with the session-pooler URI from Supabase dashboard → Project Settings → Database, substituting `reporting_ro` and that password.

---

## 8. Gotchas

- `status` casing is inconsistent — always lowercase before comparing.
- `date_of_appointment` can be `NULL` for clinics that capture unscheduled leads (Premier Vascular, ECCO Medical, Davis Vein & Vascular, Horizon Vascular Specialists). Those rows carry a `time_preference` instead.
- One patient can legitimately have multiple rows over time; only the row with `is_superseded = false` is current.
- Default PostgREST page size is 1000 rows — paginate with `Range` headers or `.range()` when pulling full extracts.
