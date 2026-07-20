## Goal
Add a custom date range option to the Detailed Stats modal (Project Detailed Dashboard) so users can pick any Start Date and End Date — e.g. "this month so far" — instead of being constrained to Today / Week / Monthly / Last 90 Days.

## Scope
File: `src/components/projects/ProjectDetailedDashboard.tsx` (the modal opened from Project cards).

Only the filter row inside the modal is changing. Data-fetching logic already respects `dateRange.from`/`dateRange.to`, so no query changes are needed.

## Changes

1. Add a "Custom" control next to the existing Today / Week / Monthly / Last 90 Days buttons, using two `Popover` + `Calendar` date pickers (Start Date, End Date) — same pattern as `AccountPerformanceHeatmap.tsx`.
2. Selecting either date updates `internalDateRange.from` / `internalDateRange.to` directly, which flows through the existing `useEffect` that refetches stats.
3. Highlight the Custom pickers as "active" when the current `internalDateRange` doesn't match any of the quick presets (Today/Week/Monthly/Last 90).
4. `Clear All` continues to reset the custom pickers (already resets `internalDateRange`).
5. Keep the existing "date range text" summary on the right unchanged — it already renders arbitrary from/to ranges correctly.

## Out of scope
- No changes to backend queries, other dashboards, or the Account Performance Heatmap.
- No change to default preset on open.
