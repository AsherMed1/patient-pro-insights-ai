# Date filters for the Approved Review Queue bucket

## What the user sees

In the Review Queue's **Approved** tab, add a date-range filter so the list can be narrowed by approval date. This keeps the high Approved count manageable without affecting the other buckets.

- Two compact date pickers appear only when the **Approved** tab is active: **Approved from** and **Approved to**.
- Selecting a range filters the list to records whose `reviewed_at` falls inside the range (inclusive).
- A small **Clear** button resets the approved date range.
- The Approved tab's total count badge remains unchanged; only the rendered list is filtered.

## Data and sync

No schema or backend change is required. Approval already stores `reviewed_at` on the `all_appointments` row. Filtering happens client-side by adding `.gte('reviewed_at', ...)` and `.lte('reviewed_at', ...)` to the existing Supabase query for the approved view.

## Technical notes

All changes are in `src/components/admin/ReviewQueue.tsx`:

1. Add state:
   - `approvedDateFrom?: Date`
   - `approvedDateTo?: Date`

2. Add imports:
   - `Popover`, `PopoverContent`, `PopoverTrigger` from `@/components/ui/popover`
   - `Calendar` from `@/components/ui/calendar`
   - `CalendarIcon` from `lucide-react`
   - `format` from `date-fns`
   - `cn` from `@/lib/utils` (already imported)

3. In the `fetch()` callback, when `queueView === 'approved'`:
   - If `approvedDateFrom` is set, apply `.gte('reviewed_at', approvedDateFrom at start of day in UTC)`.
   - If `approvedDateTo` is set, apply `.lte('reviewed_at', approvedDateTo at end of day in UTC)`.

4. In the filter bar (after the project selector):
   - Render the two popover date pickers only when `isApprovedView` is true, using the same compact style as QA Operations (`Button variant="outline" size="sm"`, `CalendarIcon`, `format(date, 'MMM d')`).
   - Add a small **Clear** button next to the pickers that resets both dates.

5. Reset `approvedDateFrom` and `approvedDateTo` to `undefined` when the user switches away from the Approved tab, so the filter does not accidentally carry over to another bucket.

6. Add `approvedDateFrom` and `approvedDateTo` to the `fetch` dependency array so the query refreshes when the range changes.
