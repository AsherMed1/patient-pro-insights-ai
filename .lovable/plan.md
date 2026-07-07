# Why the service filter under-counts

The Service dropdown in `AllAppointmentsManager.tsx` (lines ~285, ~426, ~575, ~1570) filters on:

```
calendar_name ILIKE %X% OR parsed_pathology_info->>'procedure' = X
```

But the parser stores the procedure in two different keys depending on the code path:

- `parsed_pathology_info.procedure` — set by the older intake parser
- `parsed_pathology_info.procedure_type` — set by `bulk-parse-all-intake-notes` and newer parsers (this is what the UI badges read)

For Premier Vascular, June 1–30, the actual distribution is:

- **23** rows with `procedure_type = 'GAE'` (that's what you see in the list)
- **6** rows with `procedure_type = 'PFE'` (you likely read the "P" badge as PAE — it's PFE)
- **0** rows with `procedure_type = 'UFE'` or `'PAE'`

Total 29. When filtering by "GAE", only 7 rows have both `procedure = 'GAE'` OR a `GAE` calendar name, so the other 16 GAE rows disappear. Same for PFE (3 shown out of 6). That's the whole mismatch — no data is missing, the filter just checks the wrong JSON key.

# Plan

## 1. Fix the Service filter to check both JSON keys

In `src/components/AllAppointmentsManager.tsx`, update all four service-filter `.or(...)` clauses to also match `parsed_pathology_info->>'procedure_type'`:

Before:
```
calendar_name.ilike.%X%,parsed_pathology_info->>procedure.eq.X
```

After:
```
calendar_name.ilike.%X%,parsed_pathology_info->>procedure.eq.X,parsed_pathology_info->>procedure_type.eq.X
```

Apply to the four locations: count query (~line 285), list query (~line 426), export query (~line 575), and Excel export (~line 1570). Keep the special GAE branch (`In-person`) and add `procedure_type.eq.GAE` to it as well.

## 2. Verify

After the fix, re-run Premier Vascular, Created Date June 1–30:

- All Services: 29
- GAE: 23
- PFE: 6
- UFE: 0
- Sum: 29 ✓

## 3. (Optional) Backfill for consistency

Longer-term, migrate `procedure_type` values into `procedure` (or vice versa) so both keys always agree. Not required for this fix — the OR handles it either way — but useful to prevent future divergence. I'll skip this unless you want it.

# Technical details

- Files changed: `src/components/AllAppointmentsManager.tsx` only.
- No schema changes, no edge function work, no backfill required for the fix itself.
- Root cause is purely the query key mismatch, not missing parsed data.
