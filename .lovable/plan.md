

# Make the Side Navigation Bar Dark Mode

## What Changes
The side navigation rail will get a dark background with light-colored icons, giving it a sleek contrast against the light main content area. This applies regardless of the app's theme -- the sidebar is always dark.

## Styling Updates

### File: `src/pages/ProjectPortal.tsx`

1. **Nav container** (line 392): Change `bg-background` to a dark background (`bg-slate-900`) and update the border to `border-slate-800`
2. **Active tab icons**: Change from `bg-primary/10 text-primary` to `bg-white/10 text-white` for visibility on dark background
3. **Inactive tab icons**: Change from `text-muted-foreground hover:bg-accent` to `text-slate-400 hover:bg-white/10 hover:text-white`
4. **Bottom action icons** (Dashboard, Settings, Sign Out): Same treatment -- `text-slate-400 hover:bg-white/10 hover:text-white`
5. **Bottom separator**: Change `border-border/20` to `border-slate-700`

This creates a persistent dark sidebar that contrasts nicely with the light content area.

