# Speed up the Recapture Reports / Setter Activity load

## What I checked

- The Setter Activity data itself is tiny: 795 activity rows total (487 in the last 7 days), 3,657 recapture cases, 276 profiles.
- Run directly against the database, both queries return in under 2 ms, so the raw data volume is not the problem.
- The report's loader only clears its spinner after *all* of its steps finish in sequence: paged activity fetch, then case lookups in chunks of 200, then a full `profiles` fetch. Meanwhile the Overview report separately pulls every recapture case with `select *`, and the role hook is firing its project lookup five times per page load (visible in the console log).

So the slowness is in how the page requests data from the browser, not in the database. The exact dominant cost is not yet confirmed, so step 1 is to measure before changing anything else.

## Plan

1. **Measure first.** Add temporary timing around each request in the Setter Activity loader (activity page, case chunks, profiles) and read the timings from the browser, so the fix targets the real bottleneck instead of a guess. One likely candidate: the row-level security rule on activity and case rows re-checks the user's roles once per row, which is cheap for one row and expensive for thousands.
2. **Cut the number of round trips.**
   - Fetch activity rows and their related cases in one request (embedded relation) instead of a page loop plus chunked case lookups.
   - Only request the columns the report actually uses, instead of `select *`.
   - Only load the profiles that appear as actors, not the whole table.
3. **Stop refetching the same thing repeatedly.** Make the role hook's project list load once and share it, so a single page view doesn't repeat the same project query five times and queue up behind it.
4. **Render progressively.** Show the summary cards and the "By setter" table as soon as activity data arrives rather than blocking the whole view until every follow-up query completes, and make sure the spinner always clears (including on error) with a visible error state.
5. **Re-measure** with the same instrumentation, then remove the temporary timing code.

## Technical notes

- Files: `src/components/recapture/RecaptureSetterActivity.tsx` (loader + render gating), `src/components/recapture/RecaptureReports.tsx` (Overview `select *` over all cases), `src/hooks/useRole.tsx` (duplicate project fetches).
- If measurement shows the per-row policy check dominates, follow up with a migration that evaluates the caller's role once per query instead of once per row; no schema change is proposed until that is confirmed.
- Verification: open Recapture > Reports > Setter Activity and confirm the "By setter" table renders with data and no repeated identical requests in the network log.
