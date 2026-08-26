# Multi-Select Service Line on OON Rules

Yes — the Service line picker in the insurance denylist rule form can become multi-select. The underlying scope table already stores one row per scope, so a rule can carry several service lines without any database change.

## What changes

- The "Service line (optional)" dropdown in the Add rule form becomes a checkbox dropdown:
  - "All service lines" (default, clears all checks)
  - One checkbox per canonical service line for the selected clinic (ATE, FSE, GAE, HAE, PAD, PFE, TAE, TKR, UFE)
  - "Other (type it)" free-text still available and additive
- Trigger label shows "All service lines", the single line name, or "N service lines".
- Saving a rule with 2+ service lines creates one scope row per line, so the rule flags a plan for any of the selected lines (e.g. GAE + TKR for Joint & Vascular Institute).
- The rules table's Scope column lists every selected line for that rule (existing scope-label logic already joins multiple scope rows).
- The "Filter by service line" dropdown below stays single-select; a rule matches the filter when any of its scopes matches.

## Not changed

- No database migration; `insurance_block_rule_scopes` already supports multiple rows per rule.
- Matching/evaluation logic is untouched — it already treats any matching scope row as a hit.
- The Supported/allowlist table's per-row service line dropdown stays single-select.

## Technical notes

- `src/components/admin/InsuranceRulesConfig.tsx`
  - Replace `ruleServiceLine` string state with `ruleServiceLines: string[]`.
  - Swap the `Select` for a `DropdownMenu` + `DropdownMenuCheckboxItem` (same pattern used elsewhere in admin views).
  - In `addRule`, build the list of chosen lines (checked lines + trimmed custom value) and insert one `insurance_block_rule_scopes` row per line; when the list is empty, keep current behaviour (single scope row with `service_line: null`, only if clinic/location set).
  - Update the rules-filter predicate so a rule passes when any of its scope rows matches the selected service line.
