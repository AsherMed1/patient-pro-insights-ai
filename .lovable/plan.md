# QA Operations Queue — Clear All Filters Button Disabled State

## Problem
The "Clear all filters" button in `QAOperationsQueue.tsx` is appearing enabled even when no filters are selected (all defaults: empty search, no clinics, "All alert types", "All assignments", no date range, "New" tab).

## Current code check
- `hasActiveFilter` already checks `search`, `projectFilter`, `alertFilter`, `assignmentFilter`, `dateFrom`/`dateTo`, and `tab !== 'new'`.
- The button uses `disabled={!hasActiveFilter}` and the shadcn `Button` applies `disabled:opacity-50`.
- The screenshot shows the button at full opacity, so either the state is not at defaults or the disabled styling is not taking effect.

## Plan
1. **Verify state in the live preview**
   - Open QA Operations Queue at default view.
   - Confirm via React DevTools or a temporary debug overlay that `search`, `projectFilter`, `alertFilter`, `assignmentFilter`, `dateFrom`, `dateTo`, and `tab` are all at default values when the button appears enabled.

2. **Harden the disabled state**
   - If the state is correct but the button looks enabled, add explicit disabled styling/classes to `Clear all filters` (e.g., `disabled:opacity-40 disabled:cursor-not-allowed`).
   - If the state is wrong, trace which filter state is non-default and fix the initialization or the `hasActiveFilter` check.

3. **Add a defensive reset on mount**
   - Ensure the filter states initialize to defaults and are not restored from stale localStorage or URL params (currently only `visibleColumns` is read from `localStorage`; no filter persistence exists, but confirm none was added accidentally).

4. **Manual acceptance check**
   - Load QA Operations Queue with no filters active → button is disabled and visually faded.
   - Apply any filter → button becomes enabled.
   - Click "Clear all filters" → all filters reset and button disables again.

## Scope
Only `src/components/admin/QAOperationsQueue.tsx`. No backend or schema changes.
