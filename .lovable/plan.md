## Problem
The Appointment Details dialog (`DetailedAppointmentView.tsx`) uses `max-w-4xl` with `overflow-y-auto` but has no horizontal-overflow control. Long unbroken strings (patient IDs like `02233217-4ed0-43a2-8790-09b42795964e`, long emails, long note lines) force the inner content wider than the dialog. Because `DialogHeader` sits inside the same scrollable container, the header stretches with the content, pushing the Print / PDF button off-screen to the right. Users don't realize they can scroll horizontally.

## Fix (UI-only, single file: `src/components/appointments/DetailedAppointmentView.tsx`)

1. **Widen the dialog and make it responsive** on `DialogContent` (line 655):
   - Replace `max-w-4xl max-h-[90vh] overflow-y-auto` with a responsive width that scales up on large screens and caps sensibly:
     `w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto overflow-x-hidden`
   - This guarantees the dialog uses available screen space and never scrolls horizontally.

2. **Keep the header (with Print button) always visible regardless of body content**:
   - Make `DialogHeader` sticky at the top of the scroll container: add `sticky top-0 bg-background z-10 pb-2` so the Print button remains reachable even after scrolling long notes.
   - Ensure the header's flex row wraps on narrow widths: add `flex-wrap gap-2` to the inner `flex items-center justify-between` (line 657) so on small screens the buttons wrap under the title instead of being pushed off-screen.

3. **Prevent long strings from expanding the dialog**:
   - Add `min-w-0` to the `DialogTitle` container and `break-all` / `break-words` on note/ID text renderings where long IDs are rendered inside `.space-y-6 print-content` (targeted class additions only where long tokens appear — internal notes lines and metadata rows).

4. **Preserve print behavior**: the existing `@media print` overrides already force full width; the new `overflow-x-hidden` is scoped to screen and won't affect print output. No changes to `handlePrint` or the print CSS block.

## Out of scope
No changes to business logic, data fetching, notes writing, or the print CSS. This is purely a layout/visibility fix so the Print button is always reachable without horizontal scrolling.
