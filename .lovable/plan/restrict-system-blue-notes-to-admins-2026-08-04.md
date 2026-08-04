# Restrict system (blue) notes to admins

## Goal
The blue "System / Auto" internal notes (e.g. the `"approved" tag added to the GHL contact...` entry) should only be visible to users with the `admin` role. Everyone else sees only the regular yellow user notes.

## Behavior
- Admin: sees all notes exactly as today.
- Non-admin (agent, VA, review_only, QA, project users, clinics): blue system notes are hidden entirely.
- The "Internal Notes (N)" count reflects only the notes the viewer can see, so it never says 3 when 2 are shown.
- If a patient has only system notes, non-admins see the normal empty state.

## Technical
- File: `src/components/appointments/AppointmentNotes.tsx`
- Use the existing `useRole()` hook's `isAdmin()` alongside the already-imported `canEditNotes`.
- A note is a system note when `created_by === 'System'` (same check already used for the blue styling).
- Derive a `visibleNotes` list: admins get `notes`, others get `notes.filter(n => n.created_by !== 'System')`. Render the list and any count/empty-state from `visibleNotes`.
- Check where the "Internal Notes (N)" header count comes from (this component's header and/or the parent that passes the notes count) and align it with `visibleNotes` so the number matches what is rendered.

Data itself is unchanged — this is display-only filtering; system notes remain in `appointment_notes` for audit.
