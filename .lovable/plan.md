

# Move Header Action Icons to Side Navigation

## What Changes
Move the three action icons (Back to Dashboard, Settings, Sign Out) from the top-right sticky header into the side navigation rail. They will be placed at the bottom of the sidebar, separated from the tab navigation icons at the top by a spacer, creating a cleaner header that only shows the project name.

## Visual Layout

```text
+--sticky header (project name only)-------+
|                                           |
| [Cal]  |   Main Content Area             |
| [Chart]|                                  |
|        |                                  |
|  ...   |                                  |
|  spacer|                                  |
|        |                                  |
| [<-]   |                                  |
| [gear] |                                  |
| [exit] |                                  |
+--------+----------------------------------+
```

## Technical Details

### File: `src/pages/ProjectPortal.tsx`

1. **Remove** the three icon buttons (ArrowLeft, Settings, LogOut) from the sticky header's right side (lines 386-398)
2. **Add** them to the side nav (lines 405-441), positioned at the bottom using `mt-auto` spacer before the group
3. Each icon gets a Tooltip (same pattern as existing CalendarDays/BarChart3 buttons):
   - ArrowLeft -> "Back to Dashboard" (navigates to `/`)
   - Settings -> "Settings" (links to `/settings`)
   - LogOut -> "Sign Out" (calls `signOut`)
4. Add a visual separator (`border-t border-border/20`) above the bottom icon group
5. The nav already uses `flex flex-col`, so adding `mt-auto` to the bottom group pushes it to the bottom
6. Style matches existing nav icons: `h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent`

