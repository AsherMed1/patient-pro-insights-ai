# Review Queue: make tab counts respect the active filters

## Problem

The four tab badges (New, Pending Review, Declined, Approved) are computed by a separate query that only filters on review status and stage. It ignores the search box, the project selector, and the Approved date range — so searching a patient name or picking dates changes the list but leaves the totals at their full, unfiltered values (e.g. Approved 22308).

## What changes

The counts become filter-aware, so each badge shows how many records in that bucket match what is currently on screen.

- Typing in the search box updates all four counts to matches for that name/phone/email.
- Choosing a project narrows all four counts to that clinic.
- The Approved date range narrows the Approved count (it targets the approval timestamp, so it applies to that bucket only).
- Clearing search/filters restores full totals.
- Counts stay accurate above the 500-row list cap, since they are still exact head counts, not a length of the loaded list.

## Technical notes

In `src/components/admin/ReviewQueue.tsx`, `fetchCounts` (around lines 476-496):

- Extend the `base(status, stage)` helper to apply the same filters as `fetch()`:
  - `projectFilter !== 'ALL'` → `.eq('project_name', projectFilter)`
  - non-empty `search` → the same `.or('lead_name.ilike…,lead_phone_number.ilike…,lead_email.ilike…')` clause
  - for the `approved` count only, apply `.gte('reviewed_at', from)` / `.lte('reviewed_at', to)` using the existing `approvedDateFrom` / `approvedDateTo` day-boundary logic.
- Add `projectFilter`, `search`, `approvedDateFrom`, `approvedDateTo` to the `useCallback` dependency array so the existing `useEffect([fetch, fetchCounts])` re-runs the counts when filters change.
- Factor the shared filter application into a small local helper used by both `fetch` and `fetchCounts` so the two queries cannot drift apart.
