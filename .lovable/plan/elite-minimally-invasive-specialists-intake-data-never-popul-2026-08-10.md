# Elite Minimally Invasive Specialists: intake data never populates

## What's actually wrong

The record you're looking at (DONOTCONTACT TESTLEAD, PAE consultation, created today 19:43) only ever received the handful of fields GoHighLevel's workflow webhook posted: address/city/state/zip, the insurance card link, and "had imaging before". That's why Age, Email, Insurance, PCP, Pathology and the intake notes are all empty.

The step that normally fills everything in — the portal calling back into GHL to pull the full contact record and all custom fields — never ran for this clinic.

Root cause, verified in the database: the project row for **Elite Minimally Invasive Specialists** was auto-created on Aug 6 by the orphan-prevention path with **no GHL location ID and no GHL API key**. The enrichment routine requires both, and silently returns "Missing GHL credentials" when either is absent. Every appointment for this clinic will keep arriving half-empty until credentials are attached.

Of the 52 active projects, Elite is the only real clinic in this state (the other three are internal test accounts).

Secondary issue visible in the same screenshot: Date of Birth reads **08/01/2026** with Age blank. The DOB validator only rejects future dates and years before 1900, so a nine-day-old "birth date" passes.

## The fix

1. **Attach GHL credentials to Elite.** The location ID (`7LaQyWqs57pIztlSpfZo`) is already on the clinic's appointments, so it can be backfilled automatically. The API key is per-sub-account (all 49 configured clinics have distinct keys), so you'll need to provide the Elite sub-account's private integration token — I'll store it against the project.

2. **Stop it happening again — auto-fill the location ID.** When the webhook handler resolves or auto-creates a project and the payload carries a location ID that the project row is missing, write it to the project. This removes half of the failure mode for every future clinic.

3. **Make the silent failure loud.** When enrichment aborts for missing credentials, record it instead of only logging: raise an admin-visible warning (audit log entry + a "GHL credentials missing" indicator on the project in Projects/Admin) so a new clinic can't quietly run for days on stub data.

4. **Backfill Elite's existing records.** Once the key is in place, re-run contact enrichment and intake parsing for the clinic's existing appointments so the current record fills in.

5. **Tighten the DOB guard.** Reject DOBs implying an implausible age (younger than ~13) in the webhook's `normalizeDob` and in the intake parser, so a stray date field can't land in the Demographics card. Clear the bogus 2026-08-01 value on the affected record.

## Technical details

- `supabase/functions/ghl-webhook-handler/index.ts`
  - `enrichAppointmentWithGHLData`: on missing `ghl_api_key`/`ghl_location_id`, write an `log_audit_event` warning row (once per project per day) before returning.
  - Project resolution/creation path: `update projects set ghl_location_id = <payload location.id> where project_name = ... and ghl_location_id is null`.
  - `normalizeDob`: add a minimum-age plausibility check.
- `supabase/functions/auto-parse-intake-notes/index.ts`: same DOB plausibility check applied to parsed demographics; recompute age.
- Admin surface: badge on the project card / projects manager when `ghl_api_key` or `ghl_location_id` is null.
- Data: set Elite's `ghl_location_id`, store the provided API key, null out the bad `dob` / `parsed_demographics.dob`, then invoke `enrichAppointmentWithGHLData` + `auto-parse-intake-notes` for the clinic's rows.

## What I need from you

The GoHighLevel private integration token for the **Elite Minimally Invasive Specialists** sub-account. Without it steps 1 and 4 can't complete; steps 2, 3 and 5 ship regardless.
