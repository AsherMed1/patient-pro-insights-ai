# Make status-change notes clinic-visible, with a per-note visibility toggle

## What's happening now

Status-change notes ("Status changed from Confirmed to OON by ...") are stored as **internal**, so clinics never see them. The column default is `clinic`, but the earlier backfill marked ~33,800 status notes internal, and Review Queue writes stay internal on purpose.

## Change

1. **Status-change notes become clinic-visible.**
   Every "Status changed from X to Y by {user}" note — reschedules, Welcome Call, Cancelled, No Show, OON, Showed, etc. — is written as `clinic` from now on.

2. **Backfill existing ones.**
   Flip historical `Status changed from ...` notes from internal to clinic so clinics can see the past history too. Review Queue workflow notes (declines, stage moves, approve/GHL tag pushes, "Superseded — a newer booking exists") stay internal.

3. **Per-note visibility toggle (team only).**
   On each note, team users (admin/agent/VA — anyone who can already edit notes) get a small control to switch a note between **Clinic visible** and **Internal**. Clinic portal users don't see the control and don't see internal notes at all. Switching to Internal on a note the clinic already saw simply hides it going forward.

## Technical notes

- `src/utils/appointmentStatusChange.ts`: pass `visibility: 'clinic'` explicitly on the status-change note insert (and keep the DNC/OON "Re-triggered ..." + "DO NOT CALL" notes clinic-visible too).
- Data change (insert tool, not a migration): `UPDATE appointment_notes SET visibility='clinic' WHERE visibility='internal' AND note_text LIKE 'Status changed from %'`.
- `src/hooks/useAppointmentNotes.tsx`: add `setNoteVisibility(noteId, visibility)` that updates the row, patches local state, and writes an audit event like the existing edit path.
- `src/components/appointments/AppointmentNotes.tsx`: make the existing `Internal` badge an interactive toggle (badge/button with Eye / EyeOff) rendered only when `!isClinicUser && canModify`; label reads "Internal" or "Clinic visible".
- No schema migration, no RLS change — the `visibility` column and policies already exist.
- Note: blue `System` notes remain admin-only regardless of visibility (existing rule, unchanged).
