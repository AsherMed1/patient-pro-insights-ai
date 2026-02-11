

# Fix: Tab Padding / Spacing

## Problem
The tabs have too much horizontal spacing between the icon, label, and badge. The `w-full` on each inner `div` stretches the content across the entire tab width, and `ml-auto` pushes the badge to the far right edge, creating excessive whitespace.

## Changes

### File: `src/components/appointments/AppointmentsTabs.tsx`

For all 5 tab triggers (lines 89, 101, 113, 125, 137):
- Remove `w-full` from the inner `<div className="flex items-center gap-2 w-full">` so the content only takes the space it needs
- Remove `ml-auto` from each `<Badge>` so it sits naturally next to the text instead of being pushed to the far edge

This keeps the tabs centered within their grid cell with tighter icon-label-badge grouping. No logic changes, purely CSS class removals on ~10 elements.

