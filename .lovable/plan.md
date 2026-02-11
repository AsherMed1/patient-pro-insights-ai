

# Fix: Appointment Management Tabs Styling

## Problem
The tab bar has excessive padding, making it look bloated. The active tab doesn't stand out clearly -- the background and shadow differences are too subtle, making it hard to tell which tab is selected.

## Changes

### File: `src/components/appointments/AppointmentsTabs.tsx`

1. **Reduce TabsList padding** -- Change `p-1.5` to `p-1` and remove `gap-0.5` to tighten the tab bar
2. **Reduce TabsTrigger padding** -- Change `py-2.5` to `py-2` on desktop for a more compact look
3. **Improve active state visibility** -- Add a stronger active indicator:
   - Add `data-[state=active]:shadow-md` for more contrast
   - Add `data-[state=active]:border data-[state=active]:border-primary/20` for a subtle border on the active tab
4. **Reduce inner gaps** -- Change `gap-2.5` inside each tab trigger to `gap-2` for tighter icon/text/badge spacing

These are purely CSS class changes across lines 84-142, no logic changes.

