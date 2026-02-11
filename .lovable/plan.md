

# Shrink Project Name on Scroll with Smooth Animation

## What Changes
When the user scrolls down, the project header will smoothly transition to a compact version -- the heading shrinks from `text-2xl` to `text-lg`, the subtitle hides, and the icon shrinks. When scrolling back to the top, it smoothly expands again.

## How It Works
- Add a scroll listener in `ProjectPortal.tsx` that detects when the page has scrolled past a threshold (e.g., 50px)
- Pass a `compact` boolean prop to `ProjectHeader`
- `ProjectHeader` uses CSS `transition` classes to smoothly animate the size changes

## Technical Details

### File: `src/pages/ProjectPortal.tsx`

1. Add a `useState` for `isScrolled` and a `useEffect` with a scroll listener that sets `isScrolled = true` when `window.scrollY > 50`
2. Pass `isScrolled` as a `compact` prop to `<ProjectHeader>`

### File: `src/components/projects/ProjectHeader.tsx`

1. Add `compact?: boolean` to the props interface
2. Apply transition classes to the wrapper: `transition-all duration-300 ease-in-out`
3. Conditionally apply sizing:
   - **Icon container**: `p-2.5` when normal, `p-1.5` when compact (with `transition-all duration-300`)
   - **Icon**: `h-6 w-6` when normal, `h-4 w-4` when compact
   - **Heading**: `text-2xl` when normal, `text-base` when compact
   - **Subtitle**: visible at full size, hidden (`opacity-0 max-h-0`) when compact, with smooth opacity/height transition
4. All size changes use `transition-all duration-300 ease-in-out` for a smooth animation

