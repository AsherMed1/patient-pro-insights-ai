
# Add Standardized Reschedule Audit Notes

## Problem

There are three paths through which a reschedule can occur, and none of them write a standardized reschedule note to `appointment_notes`:

1. **Portal UI reschedule dialog** (`AppointmentCard.tsx → handleRescheduleSubmit`): Updates the DB and `appointment_reschedules` table but never creates an `appointment_notes` entry.
2. **GHL webhook** (`ghl-webhook-handler/index.ts`): Detects date changes and populates the `reschedule_history` JSONB column but never creates an `appointment_notes` entry.
3. **`update-appointment-fields` edge function**: Creates a generic note like `Updated date_of_appointment from "X" to "Y"` — readable but not the standardized format clinics need.

## Target Note Format

```
Rescheduled | FROM: 2026-01-30 10:00 | TO: 2026-02-11 13:00 | By: Jane Smith
```

## Changes Required

### 1. `src/components/appointments/AppointmentCard.tsx`

After a successful reschedule (both GHL sync paths — success, failed, and local-only), insert a standardized internal note into `appointment_notes`. This note will be written with the current user's name.

Insert immediately after the appointment DB update succeeds (after line 670), before the GHL sync attempt:

```tsx
// Create standardized reschedule note
const originalDate = appointment.date_of_appointment 
  ? `${appointment.date_of_appointment} ${appointment.requested_time || ''}`.trim()
  : 'Unknown';
const newDateTime = `${newDate} ${newTime}`;
const noteText = `Rescheduled | FROM: ${originalDate} | TO: ${newDateTime} | By: ${userName}`;

await supabase
  .from('appointment_notes')
  .insert({
    appointment_id: appointment.id,
    note_text: noteText,
    created_by: userName,
  });
```

The `userName` value comes from `useUserAttribution()` which is already imported and used in this component (line 94 area).

### 2. `supabase/functions/ghl-webhook-handler/index.ts`

When a date change is detected (lines 598–614 in the webhook handler), in addition to recording `reschedule_history`, also insert an `appointment_notes` record with the standardized format:

```typescript
// After recording reschedule history and before closing the if-block:
const fromDateTime = [
  existingAppointment.date_of_appointment,
  existingAppointment.requested_time
].filter(Boolean).join(' ');

const toDateTime = [
  webhookData.date_of_appointment,
  webhookData.requested_time
].filter(Boolean).join(' ');

await supabase
  .from('appointment_notes')
  .insert({
    appointment_id: existingAppointment.id,
    note_text: `Rescheduled | FROM: ${fromDateTime || 'Unknown'} | TO: ${toDateTime} | By: GoHighLevel`,
    created_by: 'GoHighLevel',
  });
```

This note is clearly labeled `By: GoHighLevel` so staff know the change came from the GHL side (patient self-rescheduled via GHL booking link, or staff moved it in GHL directly).

### 3. `supabase/functions/update-appointment-fields/index.ts`

The existing generic note format (`Updated date_of_appointment from "X" to "Y"`) is replaced with the standardized reschedule format when the changed field is `date_of_appointment`:

```typescript
// Special-case reschedule detection inside the note-building loop:
if (changedFields.includes('date_of_appointment')) {
  const fromDate = previousValues?.date_of_appointment || 'Unknown';
  const fromTime = previousValues?.requested_time || '';
  const toDate = updates.date_of_appointment;
  const toTime = updates.requested_time || previousValues?.requested_time || '';
  
  const rescheduleNote = `Rescheduled | FROM: ${fromDate} ${fromTime}`.trim() 
    + ` | TO: ${toDate} ${toTime}`.trim() 
    + ` | By: ${userName}`;
  
  // Insert the reschedule note separately (in addition to or instead of the generic note)
  await supabase.from('appointment_notes').insert({
    appointment_id: appointmentId,
    note_text: rescheduleNote,
    created_by: userId,
  });
}
```

This path is triggered when status changes or date edits are made directly through the portal's inline status editor (outside the reschedule dialog).

## Technical Notes

- All three note insertions are wrapped in `try/catch` (non-blocking) — consistent with the existing decoupled audit logging pattern in this codebase.
- The `created_by` field stores the user's display name (string), matching the existing pattern in `appointment_notes`.
- The note will immediately appear in the **Internal Notes** section of any open appointment (it fetches from `appointment_notes` on load and via `refreshNotes`).
- The note is visually distinguished as a system/auto note (blue card) since `created_by !== 'System'` but the note format makes it unmistakably a reschedule audit entry.

## Files Changed

| File | Change |
|---|---|
| `src/components/appointments/AppointmentCard.tsx` | Add reschedule note insertion after successful DB update in `handleRescheduleSubmit` |
| `supabase/functions/ghl-webhook-handler/index.ts` | Add reschedule note insertion when date change is detected |
| `supabase/functions/update-appointment-fields/index.ts` | Replace/supplement generic date change note with standardized reschedule format |
