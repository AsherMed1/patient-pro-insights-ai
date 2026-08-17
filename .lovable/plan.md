# Fix Reserve Time Block dialog overflow

The Reserve Time Block dialog renders content wider and taller than the dialog box: the date field, time-range row, calendar list, and reason input visibly spill past the right edge, and the whole dialog exceeds the viewport height.

## Changes (all in `src/components/appointments/ReserveTimeBlockDialog.tsx`)

1. **Contain the dialog** — give `DialogContent` `w-[calc(100vw-2rem)] sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col`, and make the body section `flex-1 overflow-y-auto overflow-x-hidden pr-1` so long calendar lists scroll inside the dialog instead of pushing content out.
2. **Stop horizontal spill** — add `min-w-0` to the body wrapper and to the flex children (time-range row, calendar rows, label) so `truncate` actually applies to long calendar names like "Request Your Neuropathy Consultation at Amber Street, San Antonio, TX".
3. **Time range row** — allow wrapping on narrow widths (`flex-wrap`) and give each `TimeInput` a `min-w-0 flex-1` container so the two selects plus the add/delete buttons fit within 480px.
4. **Footer** — keep `DialogFooter` outside the scroll area so Cancel / Reserve Time stay pinned and visible.

No logic, data, or backend changes.

## Verification
Open Reserve Time Block on a project with many long calendar names at a small window height: the dialog stays within the viewport, nothing extends past its rounded border, the calendar list scrolls internally, and the footer buttons remain visible.
