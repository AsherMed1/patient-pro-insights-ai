# Service-line scoping for Potential OON insurance rules

Let a block rule or a supported (accepted) insurance apply to a whole clinic, one location, one service line, or a location + service line combination. Empty service line keeps today's behavior: applies to every service line of that clinic.

## What changes for the user

**Block rules tab**
- New optional "Service line" dropdown next to Clinic scope and Location. Options load from the selected clinic (distinct service lines seen on that clinic's appointments, plus the known service list already used by the dashboard filters), with a free-text fallback so a new line can be typed in.
- The rules table Scope column shows the service line, e.g. `Alliance Vascular · Amber Street · Neuropathy`.
- The clinic filter above the table gains a service-line filter.

**Supported insurances tab**
- Each accepted plan row can be scoped to a service line. Clinic-wide rows (no service line) still cover every line.
- The list is grouped/filterable by service line, so ALLY Vascular can keep one accepted list for Knee Pain and another for Neuropathy (matching the shared list plus the line-specific extras).
- The GHL sync keeps writing clinic-wide rows (GHL's dropdown is not per service line); service-line rows are added manually and are never overwritten by the sync.

**Rule tester**
- Adds a Service line selector so a rule can be dry-run against the exact clinic + location + service line combination.

## Matching behavior

For each appointment we resolve the service line the same way the dashboard already does: `parsed_pathology_info.procedure_type` (or `.procedure`), falling back to the service parsed out of the calendar name.

- Block rule fires only if clinic, location, and service line scopes all match. A scope row with no service line matches any line.
- Allowlist: the accepted list for an appointment = clinic-wide rows + rows for that appointment's service line. Rows for a different service line are excluded. If the appointment's service line can't be determined, the clinic-wide rows are used (no line-specific row can flag it) — this avoids false OON flags from missing parse data.

## Technical details

- Migration:
  - `insurance_block_rule_scopes`: add `service_line text` (nullable).
  - `clinic_supported_insurances`: add `service_line text` (nullable); replace the `UNIQUE (project_name, normalized)` constraint with `UNIQUE (project_name, normalized, coalesce(service_line,''))` via a unique index so the same plan can exist per line; GHL sync upsert switches to that conflict target with `service_line` null.
- `supabase/functions/_shared/oon-matcher.ts`: add `serviceLine` to the match input, honor `service_line` in `scopeMatches`, filter supported insurances by service line in `evaluateAllowlist`, load the new column in `loadBlockRules` / `loadSupportedInsurances`, and add a shared `resolveServiceLine(appt)` helper.
- `src/lib/oonMatching.ts`: mirror the same changes (browser copy used by the Rule Tester).
- `supabase/functions/evaluate-potential-oon/index.ts`: pass the resolved service line into the matcher input; supported-insurance cache keyed by clinic still fine (filtering happens in the evaluator).
- `supabase/functions/sync-ghl-insurance-options/index.ts`: write `service_line: null` and use the new conflict target.
- `src/components/admin/InsuranceRulesConfig.tsx`: service-line state for the rule form, supported-insurance form, table columns, filters, and the tester; service-line options fetched per clinic from `all_appointments` (distinct `parsed_pathology_info.procedure_type` / calendar-derived service).
- Update the Potential OON memory doc with the new scoping rules.
