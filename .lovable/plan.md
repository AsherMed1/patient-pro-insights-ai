

## Add Confirm Button to Appointment Date/Time Editor

### Problem
When editing an appointment's date and time, selecting a date immediately saves it (along with the old time), forcing the user to re-open the editor to change the time. The user wants to pick both date and time first, then confirm with a single save action — like GoHighLevel does.

### Changes

**File: `src/components/appointments/AppointmentCard.tsx`**

1. **`AppointmentDateTimeEditor` component** (~line 1804): Add local staging state for date and time so selections don't immediately propagate to the parent. Add a "Confirm" button that commits both changes at once, and a "Cancel" button that discards changes and closes the popover.

   - Add `pendingDate` and `pendingTime` local state (initialized from current values)
   - Calendar `onSelect` updates `pendingDate` only (no parent callback)
   - Time slot / custom time updates `pendingTime` only
   - New "Confirm" button calls `onDateSelect(pendingDate)` then `onTimeSelect(pendingTime)` together
   - New `onClose` prop to close the popover on Cancel

2. **Popover usage** (~line 1392): Convert the `<Popover>` to a controlled popover with `open`/`onOpenChange` state so the editor can close itself on Confirm or Cancel.

3. **Interface update** (~line 1790): Add `onClose` callback to `AppointmentDateTimeEditorProps`.

### Technical Detail

The key architectural change is introducing a two-phase commit: selections are staged locally inside `AppointmentDateTimeEditor`, and only flushed to the parent (which triggers the database save and GHL sync) when the user clicks "Confirm". This mirrors the GHL workflow the user referenced.

