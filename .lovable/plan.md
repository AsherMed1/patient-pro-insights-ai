

# Fix Project Card Layout and Alignment

## Problems
1. Project name and badge/actions sit side-by-side, causing long names to push content and overlap
2. "Appointments" text overflows its stat box on narrower cards
3. Buttons float at different vertical positions across cards of varying height
4. Created and Last Activity dates need to always be visible

## Changes to `src/components/projects/ProjectCard.tsx`

### 1. Use flex-col with h-full so cards stretch uniformly
- Add `h-full flex flex-col` to the outer `Card`
- Make `CardContent` use `flex-1 flex flex-col` so the button section can be pushed to the bottom

### 2. Restructure the header
- Stack the project name on its own line (full width, truncated with `truncate` if needed)
- Put the activity badge and action icons on a second row below the name
- This prevents long names like "Vascular Institute of Michigan" from colliding with badges

### 3. Fix the "Appointments" overlap
- Shorten the label to "Appts" in the stat boxes, or use `text-[10px] leading-tight truncate` to prevent overflow

### 4. Always show Created and Last Activity
- Show "Last activity: --" when there is no activity data instead of hiding the row entirely
- This keeps card heights consistent

### 5. Pin buttons to the bottom
- Use `mt-auto` on the button container so it always sticks to the bottom of the card regardless of content height

## Technical Summary

```
Card (h-full flex flex-col, border-l-4)
  CardHeader
    Row 1: Project Name (truncate) + Disabled badge
    Row 2: Activity badge + toggle/edit/delete icons
  CardContent (flex-1 flex flex-col)
    Stats grid (Leads | Calls | Appts)
    Created date
    Last activity date (always shown)
    Spacer (flex-1)
    Buttons pinned at bottom (mt-auto)
```

All changes are in a single file: `src/components/projects/ProjectCard.tsx`. The parent grid in `ProjectsManager.tsx` already uses CSS grid, so adding `h-full` to the cards will make them equal height automatically.

