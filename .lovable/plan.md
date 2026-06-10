# OON Status — Two-Step Confirmation

Add a guard so that selecting **Out of Network (OON)** from an appointment's status dropdown does not apply immediately. Instead, a confirmation modal opens and the user must type `CONFIRM` (case-insensitive, trimmed) before the status change is committed and downstream GHL workflows are triggered.

## Scope

UI-only change to the appointment status dropdown on `src/components/appointments/AppointmentCard.tsx`. No backend/edge function changes — once the user confirms, we call the existing `onUpdateStatus(appointment.id, 'OON')` path so all current GHL sync behavior runs unchanged.

Out of scope:
- Admin "OON" button in the Review Queue (`src/components/admin/ReviewQueue.tsx`) — that is an admin-only triage action, not the clinic-facing status dropdown described in the request. Leaving untouched unless you want it added.
- Server-side enforcement / audit changes.

## Behavior

1. User opens the status dropdown on an appointment card and selects **OON**.
2. `handleStatusChange` intercepts `'oon'` (alongside the existing `rescheduled` / `cancelled` interceptors) and opens a new AlertDialog instead of calling `onUpdateStatus`.
3. Modal contents:
   - **Title:** "Mark patient as Out of Network?"
   - **Body:** "This will trigger appointment cancellation workflows, patient notifications, and status updates in connected systems (GoHighLevel). This cannot be automatically reversed. Type **CONFIRM** below to proceed."
   - Text input for the confirmation phrase.
   - **Cancel** button (closes modal, no change).
   - **Confirm** button — disabled until the input equals `CONFIRM` (case-insensitive, trimmed). On click: closes modal, clears input, calls `onUpdateStatus(appointment.id, 'OON')`.
4. If the user cancels or closes the modal, the dropdown value visually reverts (the Select is already controlled by `appointment.status`, so no extra wiring needed).

## Technical Notes

File: `src/components/appointments/AppointmentCard.tsx`

- Add state: `showOonDialog`, `oonConfirmText`.
- In `handleStatusChange`, add branch: `else if (newStatus.toLowerCase() === 'oon') { setOonConfirmText(''); setShowOonDialog(true); }` before the final `else`.
- Add an `AlertDialog` (reuse `@/components/ui/alert-dialog` already imported in the file) near the existing cancel/reschedule dialogs, with an `Input` for the confirmation phrase and a destructive-styled confirm action.
- Confirm handler: `onUpdateStatus(appointment.id, 'OON'); setShowOonDialog(false); setOonConfirmText('');`.

No new dependencies, no schema or edge function changes.
