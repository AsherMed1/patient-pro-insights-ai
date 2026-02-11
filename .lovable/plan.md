

# Fix Content Area Spacing

## Problem
The main content area next to the side navigation has excessive left padding, creating too much whitespace between the sidebar and the appointment cards.

## Fix

### File: `src/pages/ProjectPortal.tsx` (line 467)

Reduce the content area padding from `p-4 md:p-6 lg:p-8` to `p-4 md:p-4 lg:p-6`. This tightens the spacing at medium and large breakpoints so the appointment cards sit closer to the side navigation rail.

Single className change on the content wrapper div.

