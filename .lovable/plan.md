# Sortable Review Queue Columns

Make the **Patient**, **Project**, **Service / Calendar**, and **Appointment** column headers in the Review Queue clickable to sort the list.

## Behavior

- Click a header → sort ascending (A–Z, or earliest date first for Appointment).
- Click the same header again → sort descending (Z–A, or latest date first).
- Active column shows an up/down arrow icon next to the label; inactive columns show a faint neutral sort icon to hint they are clickable.
- Default sort stays as it is today (newest `created_at` first) until the user picks a column.
- Only one column sorts at a time. Sorting is client-side over the already-loaded rows (no extra DB calls).

## Sort keys

| Header | Sort by |
|---|---|
| Patient | `lead_name` (case-insensitive) |
| Project | `project_name` (case-insensitive) |
| Service / Calendar | `parsed_pathology_info.procedure_type`, then `calendar_name` |
| Appointment | `date_of_appointment` + `requested_time` (nulls last) |

## Files

- `src/components/admin/ReviewQueue.tsx` — add `sortKey` / `sortDir` state, turn the four header cells into buttons with chevron icons, and apply a `useMemo` sorted view of `rows` before rendering.

No backend, schema, or business-logic changes.
