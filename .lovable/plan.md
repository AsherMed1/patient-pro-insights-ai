

# Fix Scattered Dashboard Layout

## Problems Identified
1. **Header misalignment** -- The title ("Patient Pro Client Portal") is center-aligned while user info sits on the right, creating visual imbalance
2. **Tabs overflow onto two rows** -- 13 navigation tabs wrap awkwardly with uneven spacing
3. **Inconsistent visual hierarchy** -- The header, tabs, and stats cards lack cohesive spacing and grouping

## Changes

### 1. Restructure the header (`src/pages/Index.tsx`, lines 219-258)
- Left-align the title and subtitle
- Move user email, Settings, and Admin Control into a compact inline row on the right
- Tighten vertical spacing

### 2. Improve tab navigation (`src/pages/Index.tsx`, lines 260-295)
- Use a horizontal scroll container (`overflow-x-auto`) instead of flex-wrap so tabs stay on one line
- Add subtle scroll indicators or keep the row clean with `whitespace-nowrap`

### 3. Polish stats cards (`src/components/MasterDatabaseStats.tsx`)
- Minor spacing refinement to ensure the 4-card grid aligns cleanly beneath the single-row tabs

### 4. Tighten page container (`src/pages/Index.tsx`)
- Reduce top-level `space-y-6` to `space-y-4` for a more compact, less "scattered" feel
- Ensure the header and tabs feel visually connected

## Technical Details

**Header** -- Replace the current `text-center` title block with a flex-row layout:
```text
[Title + subtitle (left)]  ----  [email | Settings | Admin | Sign Out (right)]
```

**Tabs** -- Wrap `TabsList` in a scrollable container:
```text
<div class="overflow-x-auto">
  <TabsList class="inline-flex w-auto min-w-full whitespace-nowrap">
    ...triggers...
  </TabsList>
</div>
```

This keeps all tabs visible in a single row with horizontal scroll on smaller screens rather than wrapping onto a second line.

