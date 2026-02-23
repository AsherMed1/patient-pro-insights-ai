

## Fix Reschedule Status Override and Improve Date Picker Reliability

### Problem 1: Status Stuck on "Rescheduled" (Bug)

After a reschedule, the code correctly sets `status: 'Confirmed'` in the database (line 666), but then immediately calls `onUpdateStatus(appointment.id, 'Rescheduled')` (line 819), which is a parent callback that writes the status back to "Rescheduled" in the DB. This contradicts the documented workflow where rescheduled appointments should reset to "Confirmed" and appear in the "New" tab.

**Fix in `src/components/appointments/AppointmentCard.tsx`:**
- Change line 819 from `onUpdateStatus(appointment.id, 'Rescheduled')` to `onUpdateStatus(appointment.id, 'Confirmed')` so the parent state stays in sync with what was already written to the database.

### Problem 2: GHL Sync Failed

The reschedule for James Potter (GHL appointment ID `brgJkyMiM71V3lCwjzTB`) returned a non-2xx error from the edge function. The AIC project has a valid API key (`pit-afa1b606-...`) and location ID configured. This is likely a GHL-side issue (expired token, or the appointment no longer existing in GHL). The retry button already exists in the UI to re-attempt.

**Action:** No code change needed. The GHL API key for AIC may need to be refreshed in the projects table, or the appointment may have been deleted in GHL. You can manually retry using the sync retry button on the card, or verify the API key is current in the AIC GHL account.

### Problem 3: Calendar Popover May Be Blocked in Some Browsers

The date picker inside the reschedule dialog uses a `Popover` inside a `Dialog`. On some browsers or screen sizes, the popover z-index can be lower than the dialog overlay, making the calendar unclickable.

**Fix in `src/components/appointments/AppointmentCard.tsx`:**
- Add a higher `z-index` to the `PopoverContent` for the reschedule date picker (e.g., `className="w-auto p-0 z-[9999]"`) to ensure it renders above the dialog overlay.

### Summary of Code Changes

| File | Change |
|------|--------|
| `src/components/appointments/AppointmentCard.tsx` (line 819) | Change `onUpdateStatus(appointment.id, 'Rescheduled')` to `onUpdateStatus(appointment.id, 'Confirmed')` |
| `src/components/appointments/AppointmentCard.tsx` (line 1718) | Add `z-[9999]` to the PopoverContent className for the date picker |

### Manual Action Needed
- Verify the AIC GHL API key is still valid, or retry the sync for James Potter from the appointment card.
- After the fix, James Potter's status can be manually corrected to "Confirmed" from the status dropdown to move him back to the New tab.

