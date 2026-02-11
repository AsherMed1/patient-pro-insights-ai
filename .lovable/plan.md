

# Plan: Restyle Appointment Tabs to Match Reference Design

## Design Reference
The screenshot shows a clean, minimal tab bar with:
- Tabs displayed as plain text in a horizontal row
- Active tab has a solid dark/filled background with white text and rounded corners
- Inactive tabs are plain text with no background
- No icons, no badges inside the tab triggers -- just clean text labels
- Evenly spaced across the full width

## Current State
The `AppointmentsTabs` component in `src/components/appointments/AppointmentsTabs.tsx` uses a grid layout with icons, badges, and heavy styling per tab trigger. Each tab has an icon (AlertCircle, Clock, Calendar), a text label, and a count badge.

## Changes

### File: `src/components/appointments/AppointmentsTabs.tsx`

1. **Simplify TabsList**: Replace the current grid layout with a clean horizontal flex row, with a subtle border/outline container (like the screenshot's thin border around all tabs).

2. **Simplify TabsTrigger content**: Remove icons and inline badge counts from each trigger. Keep only the text label (New, Needs Review, Upcoming, Completed, All). Move the count badge to sit beside the label as a small superscript or parenthetical if desired, or remove entirely for a cleaner look.

3. **Active tab styling**: Apply a solid dark background (`bg-foreground text-background` or similar) with rounded corners to the active tab, matching the screenshot's "Consistency" tab style. Inactive tabs get transparent background with muted text.

4. **Badge counts**: Move the count badges outside the tab triggers -- display them as small parenthetical numbers next to the label text, e.g., "New (3)" to preserve the count info without cluttering the design.

5. **Remove icons**: Remove the AlertCircle, Clock, and Calendar icon imports from the tab triggers (keep them for the section header).

## Technical Details

### Approximate new TabsList styling:
```tsx
<TabsList className="inline-flex w-full rounded-lg border border-border bg-transparent p-1 gap-1">
  <TabsTrigger
    value="new"
    className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all
               data-[state=active]:bg-foreground data-[state=active]:text-background
               data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
  >
    New {displayCounts.new > 0 && `(${displayCounts.new})`}
  </TabsTrigger>
  {/* Same pattern for needs-review, future, past, all */}
</TabsList>
```

### Mobile responsive
On mobile, the tabs will remain horizontal but with smaller text (`text-xs`) and tighter padding to fit all five tabs on screen. No stacking to single column -- keeps the clean horizontal bar from the reference.

