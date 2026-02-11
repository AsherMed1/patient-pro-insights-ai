
# Show Icon Only for Settings and Sign Out Buttons

## Problem
The "Settings" and "Sign Out" buttons in the ProjectPortal header currently show both an icon and text label, taking up unnecessary horizontal space.

## Solution
Remove the text labels and `mr-2` spacing from both buttons, keeping only the icons. Use the `icon` size variant for a compact square button.

## Technical Details

### File: `src/components/pages/ProjectPortal.tsx` (lines 386-397)

Update the two buttons in the header's right-side group:

**Settings button** (lines 387-391): Remove "Settings" text, remove `mr-2` from icon, change `size="sm"` to `size="icon"`

**Sign Out button** (lines 393-396): Remove "Sign Out" text, remove `mr-2` from icon, change `size="sm"` to `size="icon"`

```tsx
<div className="flex items-center gap-2">
  <Link to="/settings">
    <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent/50">
      <Settings className="h-4 w-4" />
    </Button>
  </Link>
  <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 hover:bg-accent/50">
    <LogOut className="h-4 w-4" />
  </Button>
</div>
```

Optionally, wrap each in a `Tooltip` so users can still see the label on hover -- but since the icons are standard (gear and logout arrow), they are self-explanatory without tooltips.
