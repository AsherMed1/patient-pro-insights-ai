
# Plan: Fix Mouse Scrolling in Reserve Time Block Time Picker

## Problem

When selecting a time in the "Reserve Time Block" dialog, mouse scroll doesn't work in the time dropdown. The dropdown appears and times are visible, but scrolling with the mouse wheel does nothing.

## Root Cause

The `TimeInput` component has a scrollable dropdown list inside a `Popover`. When popovers/dialogs are rendered, they can interfere with pointer events on child elements. The scrollable `<div>` at line 191-208 is missing the `pointer-events-auto` class, which prevents mouse wheel scrolling from being captured.

This is the same issue that was previously fixed for the Calendar component (see the `shadcn-datepicker` context in the project).

## Solution

Add `pointer-events-auto` to the scrollable container in `TimeInput.tsx`.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/appointments/TimeInput.tsx` | Add `pointer-events-auto` class to scrollable dropdown container |

---

## Implementation

### Current Code (Line 191-193)

```tsx
<div 
  ref={listRef}
  className="max-h-[200px] overflow-y-auto"
>
```

### Fixed Code

```tsx
<div 
  ref={listRef}
  className="max-h-[200px] overflow-y-auto pointer-events-auto"
>
```

---

## Why This Works

The `pointer-events-auto` class ensures that:
1. Mouse events (including scroll wheel) are properly captured by the element
2. The scrollable area responds to mouse wheel input even when nested inside dialog/popover layers
3. This follows the same pattern already used successfully for the Calendar component in this codebase

---

## Summary

This is a one-line CSS class addition that restores mouse scroll functionality to the time picker dropdown.
