

# Modernize the Top Header Section

## What Changes
Streamline the top navigation bar and project header into a single, cohesive section -- removing the oversized bordered card, shrinking the icon, and integrating everything into a compact, modern layout.

## Design Approach
- Merge the nav bar and project identity into one unified header strip instead of two separate blocks
- Remove the bordered `section-card` container from `ProjectHeader` -- no card wrapper needed
- Reduce the project name from `text-4xl/5xl` down to `text-2xl` for a proportional heading
- Shrink the Building icon and its container for better balance
- Remove the bottom gradient divider line
- Keep the subtitle but make it smaller and more subtle

## Technical Details

### File: `src/components/projects/ProjectHeader.tsx`

Full rewrite of the component:

1. Remove the `section-card` wrapper (bordered card with padding) -- replace with a simple `div` with minimal padding
2. Reduce the icon container from `p-4` / `rounded-2xl` to `p-2.5` / `rounded-xl`, and the icon from `h-10 w-10` to `h-6 w-6`
3. Change heading from `heading-1` (text-4xl/5xl) to `text-2xl font-bold tracking-tight`
4. Reduce subtitle text size from `body-base` to `text-sm text-muted-foreground`
5. Remove the bottom gradient divider (`w-full h-px bg-gradient-to-r...`)
6. Remove `text-center` and `mb-5` -- keep left-aligned, tighter spacing

### File: `src/pages/ProjectPortal.tsx`

Line 375 area -- Tighten the top nav bar:
- Remove the heavy `border-b border-border/30 pb-4` and negative margins from the page-header div
- Use a simpler flex row with `pb-2 mb-4` for less vertical space

This produces a compact header where the nav bar flows naturally into the project name, taking roughly half the vertical space of the current layout.
