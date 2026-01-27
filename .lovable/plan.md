

## Plan: Reserved Time Blocks to Prevent Overbooking

### Overview

Create a feature allowing clinics to reserve specific dates/times directly in the Portal. When a slot is reserved, it automatically creates a confirmed "Reserved" appointment in the GHL calendar, preventing callers from booking that time slot.

---

### Part 1: Database Changes

**Add a new appointment type indicator to distinguish reserved blocks from patient appointments**

No new table required. Instead, we'll use the existing `all_appointments` table with a special marker:

- `lead_name`: Set to "RESERVED" or "Reserved - [Reason]"
- `status`: Set to "Confirmed" (blocks the time in GHL)
- Add a new column `is_reserved_block` (boolean) to explicitly identify reserved slots

```sql
ALTER TABLE all_appointments 
ADD COLUMN is_reserved_block BOOLEAN DEFAULT false;

COMMENT ON COLUMN all_appointments.is_reserved_block IS 
  'True if this appointment is a reserved time block, not a patient appointment';
```

---

### Part 2: Create Edge Function for GHL Appointment Creation

**New file:** `supabase/functions/create-ghl-appointment/index.ts`

This edge function will:
1. Create a confirmed appointment in GHL via the API
2. Return the GHL appointment ID for local record creation

```typescript
// Key API call structure (GHL Calendars API)
const response = await fetch(
  'https://services.leadconnectorhq.com/calendars/events/appointments',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-04-15',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId: calendarId,
      locationId: ghl_location_id,
      title: 'Reserved - [Reason]',
      startTime: '2026-01-31T15:00:00-06:00',
      endTime: '2026-01-31T15:30:00-06:00',
      appointmentStatus: 'confirmed',
      toNotify: false,
      // No contactId = blocks time without patient
    })
  }
);
```

**Required Parameters:**
| Parameter | Source | Description |
|-----------|--------|-------------|
| `calendarId` | User selection | Which GHL calendar to block |
| `locationId` | Project settings | `projects.ghl_location_id` |
| `apiKey` | Project settings | `projects.ghl_api_key` |
| `startTime` | User input | ISO 8601 datetime with timezone |
| `endTime` | Calculated | startTime + duration |
| `title` | User input | "Reserved - [Reason]" |
| `timezone` | Project settings | `projects.timezone` |

---

### Part 3: Create "Reserve Time Block" Dialog Component

**New file:** `src/components/appointments/ReserveTimeBlockDialog.tsx`

A dialog component that allows clinics to create reserved time blocks:

```text
+--------------------------------------------------+
|  Reserve Time Block                          [X] |
+--------------------------------------------------+
|                                                  |
|  Date:        [January 31, 2026    ] [Calendar]  |
|                                                  |
|  Start Time:  [3:00 PM  ▼]                       |
|                                                  |
|  Duration:    [30 min ▼] [1 hour] [2 hours]      |
|                                                  |
|  Calendar:    [PAE Consult ▼]                    |
|                                                  |
|  Reason:      [___________________________]      |
|               (e.g., Staff meeting, Lunch)       |
|                                                  |
|  [Cancel]                    [Reserve Time]      |
+--------------------------------------------------+
```

**Features:**
- Date picker with time slot selection
- Duration presets (30 min, 1 hour, 2 hours, custom)
- Calendar dropdown (fetches from GHL)
- Optional reason field
- Preview of blocked slot before confirming

---

### Part 4: Add "Reserve Time" Button to Calendar Views

**Modify:** `src/components/appointments/CalendarDayView.tsx`

Add a "+" button or "Reserve Time" action to empty time slots:

```tsx
// In the time slot rendering
{slotAppointments.length === 0 && (
  <button
    onClick={() => onReserveTimeSlot(hour, date)}
    className="text-xs text-muted-foreground hover:text-primary hover:bg-accent/50 
               px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
  >
    + Reserve
  </button>
)}
```

**Modify:** `src/pages/ProjectPortal.tsx`

Add a floating "Reserve Time" button in the calendar view header:

```tsx
{showCalendarView && (
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setShowReserveDialog(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Reserve Time
  </Button>
)}
```

---

### Part 5: Calendar Display for Reserved Blocks

**Modify:** `src/components/appointments/calendarUtils.ts`

Add a new event type for reserved blocks:

```typescript
export function getEventTypeFromCalendar(calendarName: string | null, isReserved?: boolean): EventTypeInfo {
  if (isReserved) {
    return {
      shortName: 'RSV',
      fullName: 'Reserved',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-l-gray-500',
    };
  }
  // ... existing logic
}
```

**Visual Treatment:**
- Gray styling (distinct from patient appointments)
- Hatched/striped pattern to indicate blocked time
- Shows reason if provided
- Clear "Reserved" badge

---

### Part 6: Manage/Delete Reserved Blocks

**Add capability to:**
1. View reserved block details (who created it, when)
2. Delete reserved blocks (removes from GHL too)
3. Edit reserved blocks (change time/duration)

```typescript
// Delete reserved block flow:
// 1. Call GHL API to delete appointment
// 2. Delete local record from all_appointments
// 3. Refresh calendar view

const deleteReservedBlock = async (appointmentId: string, ghlAppointmentId: string) => {
  // Delete from GHL
  await supabase.functions.invoke('delete-ghl-appointment', {
    body: { ghl_appointment_id: ghlAppointmentId }
  });
  
  // Delete local record
  await supabase.from('all_appointments').delete().eq('id', appointmentId);
};
```

---

### Part 7: Edge Function for Deleting GHL Appointments

**New file:** `supabase/functions/delete-ghl-appointment/index.ts`

```typescript
// DELETE request to GHL API
const response = await fetch(
  `https://services.leadconnectorhq.com/calendars/events/appointments/${ghl_appointment_id}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-04-15',
    }
  }
);
```

---

### Part 8: User Attribution for Reserved Blocks

Track who created/modified reserved blocks:

```typescript
// When creating reserved block, store user info
await supabase.from('all_appointments').insert({
  project_name: projectName,
  lead_name: `Reserved - ${reason || 'Blocked'}`,
  date_of_appointment: selectedDate,
  requested_time: selectedTime,
  calendar_name: selectedCalendar.name,
  status: 'Confirmed',
  is_reserved_block: true,
  ghl_appointment_id: ghlResponse.appointmentId,
  patient_intake_notes: `Time block reserved by ${userName} on ${new Date().toLocaleDateString()}\nReason: ${reason}`,
});

// Also create internal note for audit trail
await supabase.from('appointment_notes').insert({
  appointment_id: newAppointment.id,
  note_text: `Reserved time block created by ${userName}. Reason: ${reason}`,
  created_by: userId,
});
```

---

### Implementation Flow Diagram

```text
User clicks "Reserve Time" on calendar
            │
            ▼
┌─────────────────────────────┐
│  ReserveTimeBlockDialog     │
│  - Select date/time         │
│  - Choose calendar          │
│  - Enter reason (optional)  │
└─────────────────────────────┘
            │
            ▼ [User clicks "Reserve"]
            │
┌─────────────────────────────┐
│  create-ghl-appointment     │
│  Edge Function              │
│  - Creates blocked time     │
│  - Returns GHL appointment  │
│    ID                       │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Insert local record        │
│  all_appointments table     │
│  - is_reserved_block: true  │
│  - lead_name: "Reserved"    │
│  - status: "Confirmed"      │
└─────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  Calendar displays          │
│  reserved block in gray     │
│  GHL prevents double        │
│  booking for that slot      │
└─────────────────────────────┘
```

---

### File Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | Add `is_reserved_block` column |
| `supabase/functions/create-ghl-appointment/index.ts` | Create | Edge function to create GHL appointments |
| `supabase/functions/delete-ghl-appointment/index.ts` | Create | Edge function to delete GHL appointments |
| `src/components/appointments/ReserveTimeBlockDialog.tsx` | Create | Dialog for reserving time blocks |
| `src/components/appointments/CalendarDayView.tsx` | Update | Add "Reserve" button to empty slots |
| `src/components/appointments/CalendarWeekView.tsx` | Update | Add "Reserve" button to empty slots |
| `src/components/appointments/calendarUtils.ts` | Update | Add "Reserved" event type styling |
| `src/pages/ProjectPortal.tsx` | Update | Add "Reserve Time" button and dialog state |
| `src/hooks/useCalendarAppointments.tsx` | Update | Filter handling for reserved blocks |

---

### Security Considerations

1. **Role-based access**: Only admin/agent users can create reserved blocks
2. **Project scoping**: Reserved blocks are tied to specific projects
3. **GHL API key security**: Keys stored in project settings, accessed via edge functions
4. **Audit logging**: All reserved block operations logged for accountability

---

### Benefits

1. **Prevents overbooking** - Confirmed appointments in GHL block the time slot
2. **Visible in portal** - Staff can see reserved times in the calendar view
3. **Bidirectional sync** - Reservation in Portal creates real GHL appointment
4. **Audit trail** - Track who reserved what and when
5. **Easy management** - Edit or delete reserved blocks as needed

