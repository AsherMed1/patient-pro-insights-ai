

## Fix: IPC Checkbox Not Persisting for "Welcome Call" Status Updates

### Root Cause

When rapidly going through a list of appointments, changing status to "Welcome Call" and checking the IPC box, the IPC click can be lost. This happens because:

1. User selects "Welcome Call" from the status dropdown
2. The status update fires, which calls `setAppointments(...)` to update local state, causing a React re-render of the appointment card
3. User immediately clicks the IPC checkbox, but the component is mid-re-render from step 2
4. The click event either doesn't register or fires on a stale component reference
5. The DB never receives the IPC update -- confirmed by checking the database where 6 appointments have `internal_process_complete: false` despite the user believing they checked it

This is verified in the database: Don Winton, CLEIVER Escobar, Gustavo Vidal, Candido Valdes, Rafael Ramirez, and Arnaldo A Rodriguez all have `status = 'Welcome Call'` but `internal_process_complete = false`, with no audit trail of an IPC toggle ever being sent.

### Fix (Two Parts)

**Part 1: Atomic status + IPC update for workflow statuses**

In `src/components/AllAppointmentsManager.tsx`, modify `updateAppointmentStatus` so that when the status is changed to a "workflow complete" status like "Welcome Call", "Showed", or "Won", the `internal_process_complete` flag is automatically set to `true` in the same database call. This eliminates the need for a separate IPC click for these statuses.

```typescript
// In updateAppointmentStatus, after building updateData:
const autoCompleteStatuses = ['welcome call', 'showed', 'won'];
if (autoCompleteStatuses.includes(status.toLowerCase())) {
  updateData.internal_process_complete = true;
}
```

Also update the local state setter (line 799-808) to include `internal_process_complete: true` for these statuses.

**Part 2: Fix the 6 existing appointments**

Run a one-time data fix to set `internal_process_complete = true` for the 6 affected Vivid Vascular appointments that are currently stuck with `Welcome Call` status but `internal_process_complete = false`.

### Files to Change

| File | Change |
|------|--------|
| `src/components/AllAppointmentsManager.tsx` | Auto-set `internal_process_complete = true` when status changes to Welcome Call, Showed, or Won |
| Database (one-time fix) | Update 6 Vivid Vascular records to set `internal_process_complete = true` |

### Impact

- Users no longer need to separately check IPC after setting "Welcome Call" -- it happens automatically
- Eliminates the race condition entirely since both fields are updated in a single DB call
- Existing workflows for terminal statuses (Cancelled, No Show, OON) already auto-set IPC via the database trigger, so this brings "Welcome Call" in line with that pattern
