# Fix Potential OON banner button overflow (Review Queue)

The amber "Potential out-of-network insurance" banner in the Review Queue is narrower than its two action buttons, so "Verified in network" and "Confirm OON" spill outside the box.

## Changes

In `src/components/admin/ReviewQueue.tsx` (the OON banner block):

- Make the button row wrap instead of forcing one line: `flex flex-wrap gap-2 pt-1`.
- Shrink the buttons to fit the narrow column: smaller height/padding/text (`h-7 px-2 text-[11px]`) and allow them to shrink (`min-w-0`).
- Add `min-w-0` / `break-words` to the banner container and match-detail lines so long plan names never push the box wider.

No logic, data, or workflow changes — presentation only.
