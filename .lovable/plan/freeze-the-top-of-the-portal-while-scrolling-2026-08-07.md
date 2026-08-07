# Freeze the top of the portal while scrolling

Keep everything inside the red box in the screenshot pinned to the top of the screen: the portal header (notifications bell, settings, sign out), the main tab bar (Dashboard / Appointments / Review Queue / QA Operations / …), and the QA Operations title row, filter row and status tabs (New / Opened / Pending / Completed / All).

## What changes for the user

- Scrolling a long QA queue keeps the notification bell, the main navigation, the active filters and the bucket tabs visible at all times.
- The frozen block sits above the table; the table's own header row keeps working as it does today.
- Same behavior for admins and for QA-specialist-only dashboards.
- On narrow screens the frozen block stays scrollable sideways as it already is, and it is capped in height so it never eats the whole screen on mobile.

## Technical notes

1. **Sticky stack with measured offsets** — hardcoded pixel offsets break when the header wraps. Add a small layout hook that measures the rendered height of the header and the main tab bar and publishes them as CSS variables (`--portal-header-h`, `--portal-nav-h`) on the page container using a `ResizeObserver`.

2. **`src/components/layout/PortalHeader.tsx`** — already `sticky top-0 z-40`. Attach a ref so its height feeds the CSS variable. No visual change.

3. **`src/pages/Index.tsx`** — wrap the main `TabsList` scroller in a sticky container at `top: var(--portal-header-h)` with `z-30` and the same `bg-gray-50/95 backdrop-blur` treatment plus a bottom border, so it never shows content bleeding through. Apply to both the admin dashboard and the setter/recapture dashboards that render a tab bar.

4. **`src/components/admin/QAOperationsQueue.tsx`** — group the title row, the Queue/Escalations/Reports switch, the filter row and the `TabsList` into one sticky wrapper positioned at `top: calc(var(--portal-header-h) + var(--portal-nav-h))`, `z-20`, opaque background, bottom border, and `max-h-[45vh] overflow-y-auto` as a safety valve. The Escalations and Reports views keep the same sticky title row.

5. **Z-index order** — header 40 > main nav 30 > QA toolbar 20 > the queue table's sticky first column (currently below 20). Dropdown/popover content already renders at `z-50`, so filter menus and date pickers stay above the frozen block.

6. Verify by scrolling the QA queue in the preview and screenshotting mid-scroll to confirm the header, nav, filters and bucket tabs all remain fixed and nothing overlaps.
