

# Streamline Header: Remove Welcome, Reorder Layout

## What Changes
- Remove the "Welcome, user@email.com" text from the header
- Move the ProjectHeader (project name + subtitle) to the very top of the page
- Replace the "Back to Dashboard" button with an icon-only button, placed next to the Settings gear icon

## Design Result
The top of the page will show: **[Icon] Alliance Vascular** (with subtitle) on the left, and on the right: **Back (arrow icon) | Settings (gear) | Sign Out (logout)** -- all as icon-only buttons in a row.

## Technical Details

### File: `src/pages/ProjectPortal.tsx` (lines 374-399)

Restructure the header area:

1. Remove lines 376-384 (the welcome text + ProjectSwitcher row)
2. Move `ProjectHeader` up into the `page-header` div on the left side
3. Add a "Back to Dashboard" icon-only button (using `ArrowLeft` icon) next to the Settings and Sign Out buttons
4. Import `ArrowLeft` from lucide-react and `useNavigate` from react-router-dom
5. The `ProjectSwitcher` component can be removed from this page since the back button replaces it

New layout structure:
```
page-header (flex justify-between)
  LEFT:  ProjectHeader (project name + subtitle)
  RIGHT: [ArrowLeft icon] [Settings icon] [LogOut icon]
```

### File: `src/components/projects/ProjectHeader.tsx`

No changes needed -- the component is already compact from the previous update.

