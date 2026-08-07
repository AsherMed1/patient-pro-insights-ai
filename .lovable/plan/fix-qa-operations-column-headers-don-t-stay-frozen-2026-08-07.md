# Fix: QA Operations column headers don't stay frozen

## What's wrong

The queue table is placed inside a bounded, scrollable box, and the header cells are marked sticky. But the shared `Table` component (`src/components/ui/table.tsx:9`) renders its own `<div class="relative w-full overflow-auto">` wrapper around the `<table>`. That wrapper becomes the nearest scroll container for the sticky header cells — and since it has no height limit, it never scrolls. The real scrolling happens one level up, so the sticky headers have nothing to stick to and simply scroll away with the rows. This matches the screenshot: rows slide up over where the header should be.

## Fix

Make the element that scrolls be the same element the headers stick inside.

- Add an optional `containerClassName` / `containerStyle` pass-through to the shared `Table` component so callers can control its internal wrapper (default behavior unchanged for every other usage).
- In `QAOperationsQueue.tsx`, move the bounded height + `overflow-auto` from the outer `div` onto the `Table` wrapper via that new prop, and leave the outer `div` as a plain bordered container.
- Keep `top: 0` on the header cells (they stick to the top of their own scroll box), keep the pinned Patient (`left-0`, z-4) and Open (`right-0`, z-4) corner cells above the body's sticky cells (z-1), and keep the max-height formula tied to the measured header/nav/title/filter CSS variables so the table fills the space under the frozen top block.

## Validation

Scroll the queue: the column header row (Patient → Ticket) stays pinned at the top of the table area under the frozen filters, sorting arrows stay clickable, and Patient/Open stay pinned during horizontal scroll.

Files: `src/components/ui/table.tsx`, `src/components/admin/QAOperationsQueue.tsx`.
