# Fix: Recapture Reports tab spins forever

## What's happening

The Reports view inside the Recapture Worklist loads its data in an effect whose dependency list includes values that are recreated on every render (`isReviewOnly`, a function rebuilt each render in the role hook, and `accessibleProjects`). Each fetch sets state, which re-renders, which re-runs the effect, which sets loading back to true — an endless loop, so the spinner never goes away and no data ever renders.

## The fix

1. In the Recapture Reports component, run the data fetch once on mount (and only re-run when the role data genuinely changes, using a stable primitive such as the joined project list), instead of depending on the recreated function reference.
2. Apply the review-only project filter at render time (derived from the loaded cases) rather than inside the fetch effect, so changing role data never restarts the fetch.
3. Guard against duplicate in-flight fetches and always clear the loading flag, including on error, so a failed query shows an empty/error state instead of an infinite spinner.
4. Same treatment for the profiles lookup effect so it can't retrigger the loop.

## Technical notes

- File: `src/components/recapture/RecaptureReports.tsx`
- Replace `[isReviewOnly, accessibleProjects]` deps with a stable key (e.g. `accessibleProjects.join(',')` plus a boolean for review-only), or move filtering into the existing `useMemo` over `cases`.
- Optionally memoize the returned helpers in `src/hooks/useRole.tsx` to prevent this class of bug elsewhere; not required for this fix.
- Verify by opening Recapture > Reports and confirming the cards and breakdowns render, with no repeating `recapture_cases` requests in the network log.
