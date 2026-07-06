## Problem

In the Appointments tab, the "All Projects" dropdown only shows a handful of clinics (Allegheny, Alliance, Ally, Apex...) even though 52 projects exist in the database.

## Root Cause

`AppointmentFilters.tsx` builds the project list by querying `all_appointments.project_name`:

```ts
const { data } = await supabase.from('all_appointments').select('project_name')...
```

Supabase caps this at 1000 rows by default. With ~19k appointments ordered by insertion, only the project names present in the first 1000 rows come back — so most clinics never make it into the dropdown.

## Fix

Switch the project list source in `AppointmentFilters.tsx` → `fetchProjects()` to query the dedicated `projects` table instead:

```ts
const { data } = await supabase.from('projects').select('name').order('name');
```

This returns all 52 clinics directly, avoids the row-cap, and matches the canonical project list used elsewhere in the app.

No other filters (status/location/service) need changes — those are derived per-project and the volumes stay well under the limit.

## Verification

- Open Appointments → All Projects dropdown, confirm all 52 clinics are listed alphabetically.
- Select a previously-missing project (e.g. one further down the alphabet) and confirm the filter applies.
