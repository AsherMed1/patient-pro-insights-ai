

# Plan: Inline Patient Updates from Calendar Detail View

## Overview

When you click an appointment on the calendar, the detail dialog currently shows status and procedure as read-only badges. This plan adds editable dropdowns for **Status** and **Procedure Status** directly in that dialog, plus ensures the existing **Notes** section and **data refresh** work seamlessly so changes sync back to the calendar and list views without navigating away.

## What Changes

### 1. Status Dropdown (replaces static badge)
- The current read-only `Badge` showing the appointment status (line ~510 in DetailedAppointmentView) becomes a `Select` dropdown
- Options: Confirmed, Showed, No Show, Cancelled, Rescheduled, OON (same as the list view's AppointmentCard)
- Changing the status calls the `update-appointment-fields` edge function
- If GHL sync is available, the status also syncs to GoHighLevel via `update-ghl-appointment`

### 2. Procedure Status Dropdown (new addition)
- A new row is added below the status showing a `Select` dropdown for procedure status
- Options: Not Set, Procedure Ordered, No Procedure Ordered, Procedure Not Covered
- Changes are saved via the same `update-appointment-fields` edge function

### 3. Calendar Auto-Refresh on Save
- The `DetailedAppointmentView` already accepts `onDataRefresh` -- but the calendar in ProjectPortal does not pass it
- Add `onDataRefresh` to the `DetailedAppointmentView` rendered from the calendar, incrementing `calendarRefreshKey` so the calendar re-fetches after any update

### 4. Notes Already Work
- The Internal Notes section with `AppointmentNotes` component is already present in the detail dialog and fully functional -- no changes needed there

---

## Technical Details

### File: `src/components/appointments/DetailedAppointmentView.tsx`

**Add imports**: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from ui/select, plus `useAuth` and `useUserAttribution` hooks.

**Add state**:
```typescript
const [currentStatus, setCurrentStatus] = useState(appointment.status);
const [currentProcedureStatus, setCurrentProcedureStatus] = useState(
  (appointment as any).procedure_status || null
);
const [isUpdating, setIsUpdating] = useState(false);
```

**Add update handler**:
```typescript
const handleFieldUpdate = async (updates: Record<string, any>) => {
  setIsUpdating(true);
  try {
    await supabase.functions.invoke('update-appointment-fields', {
      body: { appointmentId: appointment.id, updates, userId, userName, changeSource: 'portal' }
    });
    onDataRefresh?.();
    toast.success('Updated successfully');
  } finally {
    setIsUpdating(false);
  }
};
```

**Replace status Badge** (around line 510): Swap the static `<Badge>` with a `<Select>` dropdown that calls `handleFieldUpdate({ status: newValue })`.

**Add procedure status row**: New row below status with a `<Select>` dropdown for procedure status values.

**Optional GHL sync**: When status changes, also invoke `update-ghl-appointment` if `ghl_appointment_id` exists (same pattern as AppointmentCard).

### File: `src/pages/ProjectPortal.tsx`

**Pass `onDataRefresh`** to `DetailedAppointmentView` (around line 624):
```typescript
<DetailedAppointmentView
  appointment={selectedAppointment}
  isOpen={!!selectedAppointment}
  onClose={() => setSelectedAppointment(null)}
  onDataRefresh={() => setCalendarRefreshKey(prev => prev + 1)}
  onDeleted={() => {
    setSelectedAppointment(null);
    setCalendarRefreshKey(prev => prev + 1);
  }}
/>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `DetailedAppointmentView.tsx` | Replace read-only status badge with editable Select dropdown; add procedure status dropdown; add update handler using existing edge function |
| `ProjectPortal.tsx` | Pass `onDataRefresh` to refresh calendar after edits |

No new files, no database changes, no new edge functions needed. All editing uses the existing `update-appointment-fields` edge function and GHL sync patterns already proven in `AppointmentCard`.
