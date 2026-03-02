

## Fix: Date Changes Saving Without Confirmation

### Investigation Findings

The `AppointmentDateTimeEditor` component (in `AppointmentCard.tsx`) already has a two-phase commit model with pending state and a "Confirm" button. However, I identified two potential causes for the "instant save" behavior:

1. **`updateAppointmentDate` bypasses the edge function** — It writes directly to Supabase without going through `update-appointment-fields`, meaning no audit trail, no GHL sync, and no reschedule history is created. This is inconsistent with the reschedule flow.

2. **Possible popover auto-close behavior** — If the `Popover`'s `onOpenChange` fires `setDateTimePopoverOpen(false)` when the user clicks outside, and there's any watcher on state that auto-saves, the date could save prematurely.

Without seeing the exact video behavior, I suspect the issue may be that clicking a date on the calendar picker within the popover causes the popover to briefly close/reopen or that a click outside the popover triggers an unintended save.

### Proposed Changes

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` | Prevent the popover from closing on outside clicks while editing (use `modal` prop or intercept `onOpenChange` to only close via Cancel/Confirm buttons). Add a confirmation AlertDialog before saving date changes. |
| `src/components/AllAppointmentsManager.tsx` | Route `updateAppointmentDate` through the `update-appointment-fields` edge function (like status changes) so reschedule notes and audit logs are properly created. |

### Detail

**AppointmentCard.tsx — Prevent accidental popover close:**
```typescript
// Change Popover to only close via explicit actions
<Popover open={dateTimePopoverOpen} onOpenChange={(open) => {
  // Only allow opening, not closing via outside clicks
  if (open) setDateTimePopoverOpen(true);
  // Closing handled by Cancel/Confirm buttons only
}}>
```

**AllAppointmentsManager.tsx — Use edge function for date updates:**
```typescript
const updateAppointmentDate = async (appointmentId: string, date: string | null) => {
  try {
    const { error } = await supabase.functions.invoke('update-appointment-fields', {
      body: {
        appointmentId,
        updates: { date_of_appointment: date, updated_at: new Date().toISOString() },
        previousValues: { date_of_appointment: /* current date */ },
        userId, userName, changeSource: 'portal'
      }
    });
    // ... rest of handler
  }
};
```

This ensures:
- The popover stays open until the user explicitly clicks "Confirm" or "Cancel"
- Date changes go through the proper audit/notes pipeline
- Reschedule history is properly recorded

