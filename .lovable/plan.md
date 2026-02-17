

# Add Reschedule History Tracking + Fix Dianne Villarreal

## What exists today

There is no way to see previous appointment dates. When GHL sends a reschedule, the old date is overwritten. The Appointment History section shows other appointments for the same patient, but not date changes within a single appointment.

## What this adds

A "Reschedule History" log on each appointment that records every date change, so staff can see exactly what date an appointment was moved from and when.

Example display in the appointment detail view:
```
Reschedule History (1)
  Jan 30 @ 10:00 AM --> Mar 13 @ 8:00 AM  (was: Cancelled, changed Feb 3)
```

## Immediate fix: Dianne Villarreal

Run a manual SQL update to correct her record so the clinic can see her appointment:
- Set status to "Confirmed"
- Set `internal_process_complete` to `false` (moves to "New" bucket)
- Sync the corrected status to GHL

## Changes

### 1. Database migration
- Add `reschedule_history jsonb DEFAULT '[]'` column to `all_appointments`

### 2. Edge function: `ghl-webhook-handler/index.ts`
- In the reschedule detection block (where date change is detected), append the previous date, time, and status to the `reschedule_history` array before overwriting

### 3. Frontend: `DetailedAppointmentView.tsx`
- Add a compact "Reschedule History" section that renders entries from the `reschedule_history` column, showing previous date/time, new date/time, when it changed, and what the status was before

### 4. Types update
- Add `reschedule_history` to the `AllAppointment` TypeScript interface

