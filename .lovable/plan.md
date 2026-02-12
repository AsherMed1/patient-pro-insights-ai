

# Sync Status Changes to GoHighLevel from Calendar View

## Problem

When changing an appointment's status from the calendar view (via the `DetailedAppointmentView` modal), the code calls `update-ghl-appointment` with a `status` parameter -- but that edge function ignores it entirely. It only handles rescheduling (date/time changes) and calendar transfers. The `status` field is never destructured or sent to the GHL API.

This means status changes made in the calendar detail view are saved locally but never reflected in GoHighLevel.

## Solution

Update the `update-ghl-appointment` edge function to also accept a `status` parameter, map it to GHL's `appointmentStatus` values, and send it as part of the PUT request. Then ensure the `DetailedAppointmentView` (used by the calendar) calls it correctly with the project's GHL API key.

## Technical Steps

### 1. Update `supabase/functions/update-ghl-appointment/index.ts`

- Add `status` and `project_name` to the destructured request body
- Create a status mapping from portal values to GHL API values:

```
Portal Status    ->  GHL appointmentStatus
-----------          ---------------------
Confirmed        ->  confirmed
Cancelled        ->  cancelled
No Show          ->  noshow
Showed           ->  showed
```

- Add a new code path: when `status` is provided (without `new_date`/`new_time`/`calendar_id`), build a status-only update payload with `appointmentStatus` set to the mapped value
- When `project_name` is provided but no `ghl_api_key`, look up the project's `ghl_api_key` from the `projects` table (requires creating a Supabase admin client in the function)
- Keep existing start/end times from the fetched appointment so the PUT request preserves the current schedule

### 2. Update `src/components/appointments/DetailedAppointmentView.tsx`

- The existing GHL sync call (lines 135-148) already fires on status change, but it needs to also pass the `ghl_api_key` or ensure the edge function can look it up
- No structural change needed -- the call is already there, just the edge function needed to actually process the `status` field

### 3. Update `src/components/AllAppointmentsManager.tsx`

- Add GHL status sync to the `updateAppointmentStatus` function (used by the list view's `AppointmentCard` inline status dropdown)
- After the local database update and system note, call `update-ghl-appointment` with the appointment's `ghl_appointment_id` and new `status`
- This ensures list view status changes also sync to GHL consistently

### Result

- Status changes from the calendar detail modal will sync to GHL
- Status changes from the list view will also sync to GHL
- Both views use the same edge function for consistency
- Statuses that don't map to GHL values (like "Welcome Call", "OON", "Pending") will be saved locally only, with a console warning

