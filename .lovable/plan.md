# Clearer wording for carve-around system note

## New wording

When a reserved time block is placed around an existing appointment, the internal note becomes:

"Challene Paran reserved the clinic from 8:00 AM–5:00 PM on August 28, 2026. This appointment was already scheduled during the reserved time, so the system kept the existing appointment and blocked the remaining available time."

- Starts with the person's name instead of "Clinic reserved".
- Drops "routed around it".
- If a reason was entered, it is appended as a short sentence: "Reason: <reason>."

## Visibility

The note is inserted with `visibility: 'internal'` so clinics never see it (today it saves without a visibility value and shows as "Clinic visible"). Existing notes of this type are left as-is unless you want them backfilled too.

## Technical

- File: `src/components/appointments/ReserveTimeBlockDialog.tsx`, the `preservedNote` string (~line 680) and the `appointment_notes` insert just below it.
- Date formatted as "August 28, 2026" (`MMMM d, yyyy`); time window keeps the existing "8:00 AM–5:00 PM" formatting and still supports multiple ranges.
