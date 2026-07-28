## Situation

Today the QA Operations Queue has no reporting or export — audit fields (`qa_name`, `error_category`, `error_source`, `caught_before_clinic`, `resolution_type`, `date_resolved`, timestamps) are captured per case in `qa_cases` but can only be read one record at a time. There is no way to see totals, averages, or trends.

## What to build

A new **Reports** sub-tab inside the QA Operations module, **visible only to users with the `admin` role**. Agents, QA specialists, VAs, and everyone else do not see the tab and cannot reach the reporting view.

### 1. Filters
- Date range (defaults to last 30 days), driven by `first_entered_at`/`entered_queue_at`
- Clinic (project), QA specialist, alert type, error category

### 2. Summary cards
- Total audits completed
- Total errors found (cases with an `error_category`)
- Error rate (errors ÷ audits)
- Average turnaround time (queue entry → `date_resolved`/`completed_at`), humanized ("4h 12m")
- % caught before clinic
- Tickets created (ControlHub)

### 3. Breakdown tables (each sortable, each with its own export)
- **By clinic** — audits, errors, error rate, avg turnaround, caught-before-clinic %
- **By QA specialist** — audits completed, errors found, avg turnaround, tickets created
- **By error category** — count, % of all errors, top clinics for that category (the training view)
- **By error source** — count and % of all errors
- **By resolution type** — Resolved by QA / Escalated to AM / Escalated to Tech, etc.

### 4. Trend chart
Errors per week (or per day for short ranges), optionally split by error category, using the chart components already in the project.

### 5. Export
- **Export to Excel** button producing a workbook with one sheet per breakdown plus a "Raw Cases" sheet containing every filtered case row (patient, clinic, service line, alert type, QA name, error category, error source, caught before clinic, resolution, entered, resolved, turnaround hours, ticket id/url).
- Same data also available as a single CSV.
- Filenames stamped with the date range.

## Technical notes

- New component `src/components/admin/QAReports.tsx`, rendered as a tab alongside the existing queue inside `QAOperationsQueue.tsx` (queue logic untouched).
- Access gate: tab trigger and content both wrapped in `isAdmin()` from `useRole` — since admins already see every clinic, no project scoping is needed inside the report.
- Data pulled from `qa_cases` with the existing paged fetch helper so results aren't capped at 1000 rows; aggregation done client-side so filters stay instant.
- Turnaround = `coalesce(date_resolved, completed_at) − coalesce(first_entered_at, entered_queue_at)`; still-open cases are excluded from turnaround averages but counted in an "open" tally.
- QA attribution prefers the typed `qa_name` audit field, falling back to the completing user's `profiles.full_name`.
- Export built with the existing spreadsheet tooling; no schema changes and no new tables required.
