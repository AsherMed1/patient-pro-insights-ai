

# Convert Tabs to Modern Side Navigation

## What Changes
Replace the horizontal "Appointments | Overview" tab bar with a vertical side navigation using icon buttons. This creates a modern split-layout: a narrow icon sidebar on the left and the main content area on the right.

## Visual Layout

```text
+--sticky header (project name + actions)--+
|                                           |
| [Cal]  |   Main Content Area             |
| [Chart]|   (appointments or overview)     |
|        |                                  |
|        |                                  |
+--------+----------------------------------+
```

- Left rail: ~56px wide, with two vertically stacked icon buttons (Calendar icon for Appointments, BarChart3 icon for Overview)
- Active icon gets a highlighted background and accent color
- Inactive icons are muted/gray
- Tooltips on hover to show the label

## Technical Details

### File: `src/pages/ProjectPortal.tsx`

1. Replace the `Tabs` + `TabsList` + `TabsTrigger` horizontal layout with a custom side nav + content area
2. Keep the `activeTab` state and `setActiveTab` logic (already exists)
3. Structure the content area below the sticky header as a flex row:
   - **Left**: A narrow vertical nav bar (`w-14`) with icon buttons for "Appointments" (CalendarDays icon) and "Overview" (BarChart3 icon, shown only if `canViewOverview`)
   - **Right**: The content area (`flex-1`) rendering the active tab's content
4. Style the active nav item with `bg-primary/10 text-primary` and inactive with `text-muted-foreground`
5. Add `transition-colors duration-200` for smooth hover/active state changes
6. Import `CalendarDays` and `BarChart3` from lucide-react
7. Remove the `TabsList`/`TabsTrigger` components; keep `activeTab` state to control which content panel renders
8. Use Tooltip components (already available) to show labels on hover
9. The side nav should have a subtle right border (`border-r border-border/30`) and stick alongside the content

### Removed
- The horizontal `TabsList` with text-based triggers
- The `Tabs` wrapper component (replaced by manual state-driven rendering)

