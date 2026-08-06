# QA Operations Queue — Clear All Filters Button

## Goal
Add a single "Clear all filters" control beside the existing QA Operations Queue filter bar that resets every active filter back to defaults in one click, and is disabled when nothing is filtered.

## Current state
`src/components/admin/QAOperationsQueue.tsx` already maintains these filter states:
- `search` (text input)
- `projectFilter` (`string[]`, multi-select clinic dropdown)
- `alertFilter` (`'all'` default)
- `assignmentFilter` (`'all'` default)
- `dateFrom` / `dateTo` (date range popovers)
- `tab` (`'new'` default status bucket)

A `hasActiveFilter` boolean already exists (lines 524–530) and a `clearDateFilters()` helper only clears the date range.

## Changes
1. **Consolidate reset logic**
   - Add `clearAllFilters()` that resets:
     - `search` → `''`
     - `projectFilter` → `[]`
     - `alertFilter` → `'all'`
     - `assignmentFilter` → `'all'`
     - `dateFrom` / `dateTo` → `undefined`
     - `tab` → `'new'` (returns the page to its default view)
   - Update `hasActiveFilter` to also consider `tab !== 'new'` so the button disables correctly when the view is already at defaults.

2. **Add the button**
   - Position the new button inside the filter bar, after the date pickers and before the Columns dropdown.
   - Replace the current per-filter "Clear dates" button with a single "Clear all filters" button.
   - Use `variant="ghost" size="sm"` with an `X` icon to match the existing compact style.
   - Disable the button when `!hasActiveFilter`.

3. **No other scope**
   - No schema, API, or backend changes.
   - Column visibility toggles remain separate and are not reset by this button.

## Acceptance criteria
- Clicking "Clear all filters" resets clinic, alert type, assignment, date, search, and status-tab selections to their defaults.
- The button is disabled when no filter is active.
- Existing multi-select clinic behavior and date pickers continue to work unchanged.
