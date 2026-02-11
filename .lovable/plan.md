

# Typography System Update

## Overview
Add the **Inter** font from Google Fonts and create a consistent typography scale using CSS utility classes. This brings a modern, professional feel while standardizing heading sizes, weights, and letter-spacing across the entire app.

## Changes

### 1. Add Inter Font
- **File: `index.html`** -- Add a Google Fonts `<link>` for Inter (weights 400, 500, 600, 700)
- **File: `tailwind.config.ts`** -- Add `fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }` to extend the theme

### 2. Define Typography Utility Classes
- **File: `src/index.css`** -- Add a set of reusable typography classes in `@layer components`:

| Class | Size | Weight | Tracking | Use Case |
|-------|------|--------|----------|----------|
| `.heading-1` | text-4xl (md:text-5xl) | font-bold | tracking-tight | Main page titles |
| `.heading-2` | text-3xl | font-bold | tracking-tight | Section headers |
| `.heading-3` | text-2xl | font-semibold | tracking-tight | Card titles, modal headers |
| `.heading-4` | text-lg | font-semibold | tracking-tight | Sub-section headers |
| `.heading-5` | text-sm | font-semibold | tracking-wide, uppercase | Label headers, overlines |
| `.body-lg` | text-lg | font-normal | normal | Hero descriptions |
| `.body-base` | text-base | font-normal | normal | Standard body text |
| `.body-sm` | text-sm | font-normal | normal | Secondary info |
| `.stat-value` | text-3xl | font-bold | tabular-nums | Dashboard stat numbers |
| `.label-muted` | text-sm | font-medium | tracking-wide | Stat labels, meta info |

### 3. Apply Across Key Pages/Components
Update the following files to use the new classes instead of ad-hoc Tailwind strings:

- **`src/pages/Index.tsx`** -- Page title h1 and subtitle
- **`src/pages/Auth.tsx`** -- Hero heading, form heading
- **`src/pages/UserSettings.tsx`** -- Page heading
- **`src/pages/ApiDocs.tsx`** -- Page heading and subtitle
- **`src/components/projects/ProjectHeader.tsx`** -- Project name h1 and subtitle
- **`src/components/projects/ProjectStatsCards.tsx`** -- Stat labels and values
- **`src/components/MasterDatabaseStats.tsx`** -- Stat values
- **`src/components/AccountHealthDashboard.tsx`** -- Stat values
- **`src/components/CallCenterDashboard.tsx`** -- Dashboard title if present

This does not change any logic -- just replaces scattered `text-XXl font-bold tracking-tight` patterns with the centralized utility classes for consistency.

## Technical Details

**index.html** addition:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**tailwind.config.ts** addition inside `extend`:
```ts
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
},
```

**src/index.css** additions in `@layer components`:
```css
.heading-1 { @apply text-4xl md:text-5xl font-bold tracking-tight text-foreground; }
.heading-2 { @apply text-3xl font-bold tracking-tight text-foreground; }
.heading-3 { @apply text-2xl font-semibold tracking-tight text-foreground; }
.heading-4 { @apply text-lg font-semibold tracking-tight text-foreground; }
.heading-5 { @apply text-sm font-semibold uppercase tracking-wide text-muted-foreground; }
.body-lg   { @apply text-lg text-muted-foreground; }
.body-base { @apply text-base text-muted-foreground; }
.body-sm   { @apply text-sm text-muted-foreground; }
.stat-value { @apply text-3xl font-bold tabular-nums text-foreground; }
.label-muted { @apply text-sm font-medium tracking-wide text-muted-foreground; }
```

Component updates replace inline class combos like `className="text-4xl font-bold text-foreground tracking-tight"` with `className="heading-1"`.

