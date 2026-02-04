
# Plan: Sync GHL Blocked Time Slots to Client Portal

## Problem

When a time block is created **directly in GoHighLevel** (not through our portal's Reserve Time Block feature), it appears on the GHL calendar but not on the client portal calendar. This happened with Ozark's 1pm-2pm block on Feb 19th.

## Root Cause

The `ghl-webhook-handler` edge function currently only handles regular appointments. It:
1. Requires `lead_name` as a mandatory field (blocked slots don't have contacts)
2. Requires `project_name` to be extractable (may fail for blocked slots)
3. Has no detection logic for blocked slot webhook payloads

## Solution Overview

Enhance the webhook handler to detect and process GHL blocked slot events, creating them as reserved blocks in our system.

---

## Implementation Steps

### Step 1: Add Blocked Slot Detection in extractWebhookData

Add detection for blocked slot webhooks at the start of the `extractWebhookData` function. GHL blocked slots typically have:
- `type: "BlockedSlotCreate"` or `"BlockedSlotUpdate"`
- Or `appointment.slotType: "blocked"` / `"block"`
- No `contactId` or `contact` object

```typescript
// At the start of extractWebhookData function
if (payload.type?.includes('BlockedSlot') || 
    payload.appointment?.slotType === 'blocked' ||
    payload.appointment?.appointmentType === 'block') {
  console.log(`[${requestId}] Detected: Blocked Slot Webhook`)
  return extractBlockedSlotFormat(payload)
}
```

### Step 2: Create extractBlockedSlotFormat Function

Create a new extraction function for blocked slots that:
- Uses appointment title as `lead_name` (prefixed with "Reserved - ")
- Sets `is_reserved_block: true`
- Extracts start and end times for `reserved_end_time`
- Marks `internal_process_complete: true` to exclude from New tab

```typescript
function extractBlockedSlotFormat(payload: any) {
  const apt = payload.appointment || payload
  
  // Parse times
  let dateOfAppointment = null
  let requestedTime = null
  let reservedEndTime = null
  
  if (apt.startTime) {
    const startDate = new Date(apt.startTime)
    dateOfAppointment = startDate.toISOString().split('T')[0]
    requestedTime = startDate.toTimeString().slice(0, 5) // HH:mm format
  }
  
  if (apt.endTime) {
    const endDate = new Date(apt.endTime)
    reservedEndTime = endDate.toTimeString().slice(0, 5) // HH:mm format
  }
  
  // Use title as the reserved block name
  const title = apt.title || apt.notes || 'Reserved'
  const calendarName = apt.calendarName || apt.calendar?.name || 'Unknown'
  
  return {
    ghl_appointment_id: apt.id || apt.appointmentId,
    ghl_id: null, // No contact for blocked slots
    ghl_location_id: payload.location?.id || null,
    status: 'Confirmed',
    date_of_appointment: dateOfAppointment,
    requested_time: requestedTime,
    reserved_end_time: reservedEndTime,
    date_appointment_created: apt.dateAdded || new Date().toISOString(),
    lead_name: `Reserved - ${title}`,
    calendar_name: calendarName,
    project_name: payload.location?.name || extractProjectFromCalendar(calendarName),
    is_reserved_block: true,
    internal_process_complete: true, // Exclude from "New" tab
    patient_intake_notes: `Reserved Time Block\nTitle: ${title}\nTime: ${requestedTime} - ${reservedEndTime}`
  }
}
```

### Step 3: Modify Validation to Allow Blocked Slots

Update the validation logic (lines 91-104) to skip `lead_name` requirement for blocked slots:

```typescript
// Validate required fields - blocked slots don't need lead_name
if (!webhookData.is_reserved_block && (!webhookData.lead_name || !webhookData.project_name)) {
  return new Response(
    JSON.stringify({ 
      error: 'Missing required fields', 
      message: 'lead_name and project_name are required for appointments',
      extracted: webhookData,
      requestId
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// For blocked slots, only project_name is required
if (webhookData.is_reserved_block && !webhookData.project_name) {
  return new Response(
    JSON.stringify({ 
      error: 'Missing project for blocked slot', 
      message: 'Could not determine project for blocked slot',
      requestId
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### Step 4: Update getUpdateableFields for Blocked Slots

Ensure the `reserved_end_time`, `is_reserved_block`, and `internal_process_complete` fields are included when creating/updating records.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/ghl-webhook-handler/index.ts` | Add blocked slot detection, extraction function, and validation updates |

---

## Verification After Deployment

Once deployed:
1. Go to GHL Ozark calendar
2. Delete and re-create the 1pm-2pm block on Feb 19th
3. Check that it appears in the client portal calendar within seconds
4. Verify it shows as a reserved block with correct duration

---

## Alternative Approach: Manual Backfill

If GHL doesn't send webhooks for blocked slots (some GHL account configurations may not), we would need to:
1. Add a "Sync from GHL" button that fetches all blocked slots via GHL API
2. Or manually create the block in the portal instead of GHL

The webhook approach is preferred as it's real-time and automatic.

---

## Technical Notes

- GHL block slot webhooks may use event types like `BlockedSlotCreate`, `BlockedSlotUpdate`, `BlockedSlotDelete`
- The exact payload format should be confirmed with GHL documentation or by inspecting actual webhook payloads
- If GHL doesn't send blocked slot webhooks, we'll need the API polling approach instead
