

# Route "Do Not Call" to Completed Tab

## Problem

Appointments with "Do Not Call" status currently stay in the New or Needs Review tabs because it is not listed as a terminal/completed status. Since "Do Not Call" means the patient should be blocked from contact and scheduling, it should be treated like a cancelled appointment and routed to the Completed tab.

## Changes

### 1. `src/components/appointments/utils.ts`

Add `'do not call'` and `'donotcall'` to the `completedStatuses` array in the `filterAppointments` function so these appointments route to the Completed tab.

```
// Current
const completedStatuses = ['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon'];

// Updated
const completedStatuses = ['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon', 'do not call', 'donotcall'];
```

### 2. Database Trigger (if applicable)

Check whether the `handle_appointment_status_completion` trigger also needs updating to set `internal_process_complete = true` for "Do Not Call" status, keeping it consistent with other terminal statuses (showed, no show, cancelled, oon).

### Result

Appointments marked "Do Not Call" will immediately move to the Completed tab, matching the behavior of Cancelled appointments.

