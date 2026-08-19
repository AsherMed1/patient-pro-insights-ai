# QA Operations — Error Source Report

Add a third report view next to "Case Metrics" and "Specialist Activity" called **Error Source**, focused on the setter/source who caused each error, what kinds of errors they made, and which patient records those errors came from.

## What you'll see

Header: same date range + clinic / QA specialist / alert type / error category filters as Case Metrics, plus a search box for a specific setter.

**Summary cards**
- Total errors in range
- Distinct sources with at least one error
- Average errors per source
- Top source (name + count)
- Errors caught before clinic (% of errors)

**Setter leaderboard (main table)** — one row per error source, sorted by error count:
- Source name
- Total errors
- Share of all errors (%)
- Error category mix (top 2-3 categories with counts, full mix on expand)
- Clinics involved
- Caught before clinic count
- Escalated / ticketed count
- Last error date

Clicking a row expands it (or opens a side panel) with:
- Full breakdown of that source's errors by category, by clinic, and by alert type
- **Linked records list**: patient name, clinic, service, appointment date, error category, alert type, QA specialist, resolution, date resolved — each linking to the patient record (existing `patient_link`) and to the ControlHub ticket when one exists

**Category × source matrix** — compact grid showing which categories each top source repeats, so training gaps stand out at a glance.

**Trend** — weekly errors chart, optionally filtered to the selected source.

**Export** — Excel workbook with sheets: Summary, By Source, Category × Source, Linked Records (raw rows); plus CSV of the linked-records list.

## Technical notes

- New component `src/components/admin/QAErrorSourceReport.tsx`, rendered from `QAReports.tsx` by extending the existing `view` state from `'cases' | 'activity'` to include `'sources'` and adding a third toggle button (the empty slot in the screenshot).
- Reuses the existing `qa_cases` paginated fetch shape and date basis (`appointment_created_at`, falling back to `first_entered_at` / `entered_queue_at`) so numbers reconcile with Case Metrics.
- "Error" rows = cases with a non-empty `error_category` (same definition Case Metrics already uses); grouping key is `error_source`, with blank sources grouped as "Unspecified".
- Admin-only, same gate as the existing Reports toggle. No schema or backend changes needed — all fields (`error_source`, `error_category`, `patient_link`, `controlhub_ticket_url`, `qa_name`, `project_name`) are already selected today.
