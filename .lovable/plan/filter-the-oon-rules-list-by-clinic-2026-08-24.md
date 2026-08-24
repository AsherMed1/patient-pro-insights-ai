# Filter the OON rules list by clinic

## Problem

On the Block rules tab, the Clinic scope dropdown only sets the scope of a *new* rule. The rules table underneath always shows every rule for every clinic, so picking a clinic doesn't narrow what you see.

## What changes

Add a clinic filter to the rules list so the table shows only the rules that apply to the selected clinic.

- A "Filter by clinic" dropdown sits directly above the rules table (same clinic list as Clinic scope, plus "All clinics").
- Selecting a clinic shows: rules scoped to that clinic, plus global rules (no scope) since those apply there too.
- "All clinics" restores the full list.
- Row count shown next to the filter (e.g. "12 rules"), and the empty state reads "No rules for this clinic".
- The create-rule form's Clinic scope stays independent — adding a rule for a clinic auto-sets the filter to that clinic so the new row is visible.

## Technical notes

In `src/components/admin/InsuranceRulesConfig.tsx`:

- New state `rulesClinicFilter` (default `__all__`).
- Derive `visibleRules` from `rules` + `scopes`: a rule passes when the filter is `__all__`, or the rule has no scope rows, or one of its scope rows has `project_name === rulesClinicFilter`.
- Render `visibleRules` in the table body instead of `rules`; adjust the empty-state row.
- After `addRule` succeeds with a clinic scope, set `rulesClinicFilter` to that project.
- No database, query, or edge function changes — filtering is client-side over data already loaded.
