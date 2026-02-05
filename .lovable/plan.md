
# Plan: OON Status Slack Notification

## Overview

When a patient appointment is marked with "OON" (Out of Network) status, automatically send a Slack notification to alert the team for immediate follow-up. This follows the existing pattern used for "Do Not Call" status and calendar update notifications.

---

## Implementation Steps

### 1. Create Edge Function: `notify-slack-oon`

Create a new edge function that sends a formatted Slack notification when called.

**File**: `supabase/functions/notify-slack-oon/index.ts`

**Input payload**:
```typescript
interface OONNotificationPayload {
  firstName: string;
  lastName: string;
  phone: string;
  calendarName: string;
  projectName: string;
  appointmentId: string;
}
```

**Slack Message Format** (matching user's sample):
```text
ACTION REQUIRED

{firstName} is now OON.

First Name : {firstName}
Last Name : {lastName}
Call: {phone}
Calendar: {calendarName}
Account Sheet name : {projectName} | Tracking Sheet {serviceType}
Row Number : {calculatedRowNumber}

Follow up within 5 minutes.
```

**Technical details**:
- Uses existing `SLACK_WEBHOOK_URL` secret (same as support notifications)
- Extracts service type (GAE, UFE, PAE, PFE) from calendar name
- Calculates approximate "row number" by counting appointments for that project/calendar combination
- Uses Slack Block Kit for rich formatting with action required styling

---

### 2. Update Frontend: Trigger Notification on OON Status

Modify the `updateAppointmentStatus` function in `AllAppointmentsManager.tsx` to invoke the new edge function when status is set to "OON".

**File**: `src/components/AllAppointmentsManager.tsx`

**Location**: Inside the status change handler, after the existing "Do Not Call" logic block (around line 721)

**Logic**:
```typescript
// Send Slack notification for OON status
if (status === 'OON') {
  try {
    const appointmentData = appointments.find(a => a.id === appointmentId);
    if (appointmentData) {
      // Split lead_name into first/last name
      const nameParts = appointmentData.lead_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await supabase.functions.invoke('notify-slack-oon', {
        body: {
          firstName,
          lastName,
          phone: appointmentData.lead_phone_number || '',
          calendarName: appointmentData.calendar_name || '',
          projectName: appointmentData.project_name,
          appointmentId
        }
      });
      console.log('Slack OON notification sent');
    }
  } catch (oonError) {
    console.error('Failed to send OON Slack notification (non-critical):', oonError);
    // Don't throw - notification failure shouldn't block status update
  }
}
```

---

### 3. Update Config

Add the new function to `supabase/config.toml`.

**File**: `supabase/config.toml`

```toml
[functions.notify-slack-oon]
verify_jwt = false
# Send Slack notification when appointment status is changed to OON (Out of Network)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/notify-slack-oon/index.ts` | Create | New edge function for Slack OON notifications |
| `src/components/AllAppointmentsManager.tsx` | Modify | Add OON notification trigger in status update handler |
| `supabase/config.toml` | Modify | Register new edge function |

---

## Technical Notes

- **Non-blocking**: Notification failure won't prevent status update (try/catch with logged warning)
- **Reuses existing secret**: Uses `SLACK_WEBHOOK_URL` already configured
- **Row number calculation**: Counts total appointments for project to approximate sheet row
- **Service type extraction**: Detects GAE/UFE/PAE/PFE from calendar name to format sheet name
- **Name parsing**: Splits `lead_name` field into first/last components
