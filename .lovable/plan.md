# Restore the notes box for clinic portal users (Ozark)

## What happened

Nothing is broken on Ozark specifically. A recent change made the whole "Internal Notes" block team-only: in `AppointmentNotes.tsx`, clinic-portal accounts (`project_user` role) now get `return null`, so the expandable notes section and its "Add Internal Note" form disappeared for every clinic, not just Ozark. That is the missing control they are describing.

## What will change

Bring the notes box back for clinics, but with two clearly separated kinds of notes:

- **Clinic notes** — written by the clinic or by our team when we want the clinic to see it. Visible to everyone on the record.
- **Internal notes** — team-only. Never shown to clinic accounts, exactly as today.

Behaviour by user:

- **Clinic user:** sees the notes section again, titled "Notes". Can read clinic notes and add new ones (any note they write is automatically a clinic note). Internal and System notes stay hidden.
- **Our team (admin / agent / VA):** sees both, with a small "Internal" vs "Visible to clinic" marker on each note and a toggle on the add-note form. The toggle defaults to **Internal**, so nothing our team writes becomes clinic-visible by accident.
- Existing notes are treated as clinic-visible, since that is what clinics could already see before the change — no history disappears or newly appears.
- System (blue) notes stay admin-only, unchanged.

## Technical notes

1. Migration on `public.appointment_notes`:
   - add `visibility text not null default 'internal'` with a check constraint `in ('internal','clinic')`;
   - backfill every existing row to `'clinic'` except `created_by = 'System'`;
   - update the SELECT RLS policy so clinic users can only read rows where `visibility = 'clinic'` (and only for their accessible projects), and so only team roles can insert `visibility = 'internal'`. Grants stay as they are.
2. `src/hooks/useAppointmentNotes.tsx` — select and return `visibility`; `addNote` accepts a visibility argument and forces `'clinic'` when the caller is a `project_user`.
3. `src/components/appointments/AppointmentNotes.tsx` — remove the `if (isClinicUser) return null` early exit; for clinic users, filter to `visibility === 'clinic'`, label the section "Notes", and hide the visibility toggle; for team users, render the toggle plus per-note badges. Edit/delete rules stay as they are today.
4. No changes to QA Operations notes or the ControlHub comment path.
