# Bring back Internal Notes for clinics, keep Review Queue notes internal

## What happened

A recent change made the whole notes block team-only: in `AppointmentNotes.tsx`, clinic-portal accounts (`project_user`) hit `return null`, so the section and its "Add note" form vanished for every clinic — that's what Ozark is reporting. The actual goal was narrower: keep Review Queue workflow notes out of the clinic's view, not remove the section.

## What will change

1. **Clinics get the notes section back.** They can read notes and add their own, as before the change.
2. **A note now has a visibility.**
   - *Internal* — team-only. Never shown to clinic accounts.
   - *Clinic-visible* — shown to everyone on the record.
3. **All Review Queue-generated notes are written as internal**, so clinics never see them again: decline reasons, OON review outcomes, status-change entries, stage moves (New / Pending Review), and adopted-slot entries.
4. **Our team's manually typed notes stay clinic-visible by default** (matching how it worked before), with a small toggle on the add-note form to mark one as internal, and an "Internal" badge on notes clinics can't see.
5. **System (blue) notes** stay admin-only, exactly as today.
6. **Existing notes** are backfilled as clinic-visible, except System notes and any existing Review Queue entries (declines, stage moves, status changes, OON review, adopted slot), which become internal — so nothing new suddenly appears to clinics.

## Technical notes

- Migration on `public.appointment_notes`: add `visibility text not null default 'clinic'` with a check constraint `in ('internal','clinic')`; backfill existing rows to `internal` where `created_by = 'System'` or `note_text` matches the Review Queue patterns (`Declined:`, `Review Queue:`, `Status changed from`, `Potential OON insurance reviewed`, `Adopted slot FROM:`); update the SELECT policy so `project_user` accounts only read `visibility = 'clinic'` rows on their accessible projects.
- `src/components/admin/ReviewQueue.tsx`: add `visibility: 'internal'` to all five `appointment_notes` inserts.
- `src/hooks/useAppointmentNotes.tsx`: select and return `visibility`; `addNote` takes a visibility argument and forces `'clinic'` for `project_user` callers.
- `src/components/appointments/AppointmentNotes.tsx`: remove the `if (isClinicUser) return null` early exit; for clinic users filter to `visibility === 'clinic'` and hide the toggle; for team users show the toggle and an "Internal" badge. Edit/delete rules unchanged.
- Other internal writers (GHL webhook status notes, contact-attempt mirrors) keep their current behaviour in this pass; only the Review Queue paths are switched to internal.
