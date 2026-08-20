# Make System-generated notes internal-only

## What's happening

The note you saw ("Replaced 1 earlier appointment record(s) for this patient on approval…") is written by a database trigger that does not set a visibility value. The `appointment_notes.visibility` column defaults to `clinic`, so any writer that omits it produces a clinic-visible note.

Confirmed in the database: 13,075 System notes are correctly `internal`, but 44 System notes are `clinic` — the supersede/replaced notes, cancellation-reason notes, and GHL tag-applied notes.

## The fix

1. **Flip the column default** on `appointment_notes.visibility` from `clinic` to `internal`, so any writer that forgets visibility fails safe (internal), never leaking to clinics.
2. **Set `visibility = 'internal'` explicitly** in the note writers that currently omit it:
   - The supersede/replace trigger function (both the "Superseded by newer approved appointment…" note and the "Replaced N earlier appointment record(s)…" note).
   - Cancellation-reason notes (`AppointmentCard.tsx`, `DetailedAppointmentView.tsx`).
   - "GHL … tags applied" audit notes (`cancellationTags.ts`).
   - Remaining edge-function inserts that don't pass visibility (`update-ghl-contact-name`, `create-ghl-appointment`, `update-appointment-fields`, `evaluate-potential-oon`, `fetch-ghl-contact-data`, `fix-zenith-timezone-shift`, `restore-block-incident-appointments`, `ghl-webhook-handler` carry-forward rows).
3. **Backfill** the 44 existing `created_by = 'System'` notes with `visibility = 'clinic'` to `internal`.

## What stays clinic-visible

Notes written by a real person (status-change notes stamped with the user's name, manual clinic notes, welcome-call logs) keep their current behavior. Only `System`-authored notes become internal-only.

## Technical notes

- Migration: `ALTER TABLE public.appointment_notes ALTER COLUMN visibility SET DEFAULT 'internal';` plus `CREATE OR REPLACE FUNCTION` for the supersede trigger functions.
- Data backfill runs as a separate update against `created_by = 'System' AND visibility = 'clinic'`.
- No UI changes — the Internal/Clinic filter in the notes panel already handles both values.
