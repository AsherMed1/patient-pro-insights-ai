# Insurance Rules: clinic usage counts + ID number rules

## 1. Clinic usage count on canonical plans

Each canonical plan row gets a count badge on the right, e.g. `12 clinics` (or `0 clinics`).

A clinic counts as "using" a plan when either:
- one of its accepted insurance rows (Supported insurances) is linked to that plan, or matches the plan's canonical name / one of its aliases by normalized name; or
- a block rule referencing that plan is scoped to that clinic (clinic-wide/global rules count for every clinic they cover, shown separately as "all clinics").

Clicking the badge opens a popover listing the clinic names, each labelled with why it matched (Accepted list / Block rule). The count recomputes from live data whenever the accepted lists, aliases, or rules change (same realtime/refresh path the tab already uses), so editing a clinic's insurance config updates it without a reload.

## 2. New "ID number" block rule type

Block rules → Rule type gains **ID number** alongside Plan name and Group number.

- Selecting it shows an "ID number pattern" input plus the existing Match method (exact / starts with / contains / regex).
- Clinic scope, Location and Service line restrictions work exactly as they do today.
- The rules table shows the rule as `ID number · <pattern> · <method>`.
- Rule tester gains an "Insurance ID" field so a pattern can be dry-run before enabling.
- At evaluation time, the patient's insurance ID values (primary and secondary member/ID numbers from parsed insurance plus the appointment columns) are matched against the pattern; a hit flags the appointment Potential OON through the existing workflow (Review Queue block for patient-submitted, QA hold + Slack for setter-submitted), with the flag reason reading "Insurance ID matched rule".

## Technical notes

- Migration: relax `insurance_block_rules_rule_type_check` to allow `'id_number'`. No new tables or columns.
- `supabase/functions/_shared/oon-matcher.ts`: add `'id_number'` to `RuleType`, `idNumbers` to the match input, `'id'` to `matched_on`, a `normalizeId()` (alphanumeric, uppercase-insensitive) helper, an `id_number` branch in `evaluateRules`, and ID extraction in `extractInsuranceValues` (`parsed_insurance_info.insurance_id_number` / `insurance_id` / `member_id` / `policy_number`, their `secondary_*` variants, and `all_appointments.detected_insurance_id`).
- `src/lib/oonMatching.ts`: mirror all of the above (browser copy used by the Rule Tester).
- `supabase/functions/evaluate-potential-oon/index.ts`: pass the extracted ID numbers into the matcher input.
- `src/components/admin/InsuranceRulesConfig.tsx`:
  - rule form: new rule type option, ID pattern input, existing scope/service-line fields unchanged; table Rule column renders the new type.
  - Rule tester: new Insurance ID input wired into the match input.
  - Canonical plans tab: derive a `clinicsByPlan` map from the already-loaded plans/aliases plus a fetch of `clinic_supported_insurances (project_name, plan_id, normalized, active)` and `insurance_block_rule_scopes` joined to rules with `plan_id`; render the count badge + popover.
- Update the Potential OON memory doc with the new rule type and the usage-count behaviour.
