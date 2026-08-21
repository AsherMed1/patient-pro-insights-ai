# QA Operations: filter on queue-entry time, in Central Time

## Problem (verified in code)

The QA Operations Queue and both case reports currently bucket records by **appointment created date**:

- `QAOperationsQueue.tsx` filters groups on `appointment_created_at || first_entered_at || entered_queue_at`.
- `QAReports.tsx` and `QAErrorSourceReport.tsx` query `.gte/.lte('appointment_created_at', ...)`.

Day boundaries are also computed with the browser's local timezone (`setHours(0,0,0,0)` / `new Date('...T00:00:00')`), so a manager in Manila and one in Texas see different days for the same record.

Result: an appointment created Aug 17 that entered QA on Aug 19 is missing from an Aug 19 filter.

## What changes

1. **Filter basis becomes QA queue entry time.** Every operational date filter uses the moment the alert entered the QA queue (`first_entered_at`, falling back to `entered_queue_at`) instead of the appointment creation date. A record that entered the queue today shows up under Today.
2. **All day boundaries are Central Time.** From/To selections convert to CT start-of-day / end-of-day before comparison, so every user — regardless of local timezone — sees identical results. Timestamps rendered in the queue, drawer and reports are labeled and displayed in CT.
3. **Quick date presets** on the queue toolbar and both case reports: `Today`, `This Week`, `This Month`, `Custom Range` — computed against the current CT date, with the active pill highlighted. Choosing a custom date clears the highlight (same pattern already used in Error Source).
4. **Labels updated** from "Created from/to" to "Queued from/to", and the report column header from "Record Created" to "Queued for Audit", so the basis is unambiguous. The record-created value stays available as its own column for reference.
5. **Grouping behavior preserved.** A patient group is kept when *any* of its alerts entered the queue inside the range, and all of that patient's alerts stay attached, so status and history remain complete.

## Out of scope

- QA Specialist Activity report keeps filtering on when actions happened (`qa_case_activity.created_at`); it already uses Central Time.
- Turnaround metrics keep measuring first queue entry to resolution.
- No database or backend changes; `first_entered_at` / `entered_queue_at` already exist on `qa_cases`.

## Technical notes

- Add CT range helpers to `src/utils/dateTimeUtils.ts` alongside the existing `getCTStartOfDayUTC`: `getCTEndOfDayUTC(date)`, `ctToday()`, `ctPresetRange('today' | 'week' | 'month')`. Week = Monday–Sunday of the current CT week; Month = first to last day of the current CT month.
- `QAOperationsQueue.tsx`: replace `recordCreatedAt(c)` in the `groupedNoStatus` date predicate with `queuedAt(c) = c.first_entered_at || c.entered_queue_at`; compare against `getCTStartOfDayUTC(dateFrom)` / `getCTEndOfDayUTC(dateTo)`. Switch the unbounded-fetch cutoff and ordering to the same column. Add a preset pill row before the two date pickers.
- `QAReports.tsx` and `QAErrorSourceReport.tsx`: change the `.gte/.lte/.order` column from `appointment_created_at` to `first_entered_at`, with an `.or(...)` fallback for rows where `first_entered_at` is null (use `entered_queue_at`); simplest robust form is to filter on `entered_queue_at` in the query and refine in memory using `first_entered_at || entered_queue_at`. Bounds come from the CT helpers.
- `QAErrorSourceReport.tsx` already has preset state; extend it with an explicit `Custom Range` pill and CT-based bounds. Add the same preset bar to `QAReports.tsx`.
- Export sheets: date-range metadata line and per-row timestamps formatted with `formatInCentralTime`, suffixed "CT".
