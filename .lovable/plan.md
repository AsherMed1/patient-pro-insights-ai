# Collapse Specialist Activity by Patient Record

Make the "Detailed activity log" in QA Operations → Reports → Specialist Activity group by patient record instead of listing every action as its own row.

## Behavior

- Default view: **Grouped**. One primary row per unique patient record per specialist, showing:
  - Patient (linked, as today) · Clinic · Alert type(s) · QA specialist
  - Actions count badge (e.g. "5 actions") with small action chips (Opened, Claimed, Completed…)
  - First action time and last action time (CT)
  - Current status
  - Open → Complete duration for that record
- Click the row (chevron) to expand the full chronological action list — same columns as the current flat log — preserving the whole audit trail.
- A **Grouped / Flat** toggle in the log card header keeps the existing row-per-action view available for anyone who wants it.
- "Expand all / Collapse all" control.
- Card title reflects the grouping: "Activity by patient record (N records · M actions)".

## Grouping key

Group by case's patient record: `case.appointment_id` when present, otherwise `patient_name + clinic`, so repeat alerts and re-openings on the same patient collapse into one row. Grouped further by specialist so each person's work stays attributable (a record touched by two specialists shows one row each).

## Counting accuracy

Summary cards and the "By QA specialist" table already de-duplicate by case ID, so counts stay correct. The grouped log adds a visible "Records touched" metric alongside "Actions logged" so managers can see both without inflation.

## Export

- Excel gains a **Grouped Records** sheet (one row per patient record: specialist, patient, clinic, alert types, action counts, first/last action, status, turnaround) while the existing Detailed Log sheet stays intact.
- CSV export follows the currently selected view (grouped or flat).

## Technical notes

- All changes are contained in `src/components/admin/QAActivityReport.tsx`.
- New `groups` memo derived from the existing filtered `entries` array; no new queries, no schema changes.
- Expansion state held in a `Set<string>` of group keys; grouped rows render as `<TableRow>` + a second full-width row containing the nested action table (matching the pattern used elsewhere in the portal).
- Filters, time-of-day window, presets, and turnaround math are unchanged — grouping is applied after filtering.
