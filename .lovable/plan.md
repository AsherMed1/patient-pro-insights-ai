

# Fix: Tabs Styling to Match Reference (Light Theme)

## What Changes
Apply the clean, raised-card active tab style from the reference image while keeping the current light color scheme -- no dark background.

## Changes

### File: `src/components/appointments/AppointmentsTabs.tsx`

**TabsList (line 84):**
- Keep `bg-muted/40` (current light background)
- Ensure `p-1.5 rounded-xl` for a slightly roomier container

**All 5 TabsTriggers:**
- Active state: `data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-lg data-[state=active]:rounded-xl data-[state=active]:-translate-y-0.5`
- Remove `data-[state=active]:border data-[state=active]:border-primary/20` (the shadow provides enough contrast)
- Inactive state: Add `text-muted-foreground` so inactive tabs are subtler, making the active one pop more

**Badges:**
- Hide badges to match the cleaner reference design, or shrink them to `text-[10px] h-5 min-w-[20px]` for a more minimal look -- will keep them since they provide useful count info but make them smaller

No logic changes -- CSS class updates only.

