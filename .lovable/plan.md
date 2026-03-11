

## Add Reschedule Dialog to DetailedAppointmentView (Calendar View)

### Problem
When selecting "Rescheduled" from the status dropdown in the calendar's appointment detail modal (`DetailedAppointmentView.tsx`), the status updates immediately without showing a date/time picker. The reschedule dialog only exists in `AppointmentCard.tsx` (list view).

### Fix
Add the same reschedule interception and dialog to `DetailedAppointmentView.tsx`:

**File: `src/components/appointments/DetailedAppointmentView.tsx`**

1. **Add state variables** (after line 184):
   - `showRescheduleDialog`, `rescheduleDate`, `rescheduleTime`, `rescheduleNotes`, `submittingReschedule`, `projectTimezone`

2. **Add imports**: `Calendar` (from ui), `Popover/PopoverContent/PopoverTrigger`, `Label`, `Input`, `Textarea`, `DialogDescription`, `DialogFooter`, `Loader2` (if not already imported), `format as formatDateFns` from date-fns

3. **Intercept "Rescheduled" in status dropdown** (lines 727-729): Instead of directly calling `handleFieldUpdate`, check if value is "Rescheduled" — if so, fetch project timezone and show the reschedule dialog

4. **Add `handleRescheduleSubmit` function**: Mirror the logic from `AppointmentCard.tsx` lines 628-846 — create reschedule record, update appointment (reset to Confirmed, IPC false), create audit note, sync to GHL, call `onDataRefresh`

5. **Add Reschedule Dialog JSX** (before the InsuranceViewModal, after the main Dialog closes ~line 907): Render a second `Dialog` with date picker, time input, notes textarea, and submit/cancel buttons — identical UI to AppointmentCard's dialog

### Technical Notes
- The reschedule dialog will be a separate `Dialog` component nested outside the main appointment detail dialog to avoid z-index conflicts
- Calendar component needs `pointer-events-auto` class and popover needs `z-[9999]` for proper interaction inside the dialog
- After successful reschedule, calls `onDataRefresh()` to refresh the calendar view

