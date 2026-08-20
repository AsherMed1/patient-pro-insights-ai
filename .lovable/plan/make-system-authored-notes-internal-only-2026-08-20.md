# Make System-authored notes internal-only

## What's happening

The note you saw ("Replaced 1 earlier appointment record(s) for this patient on approval…") is written by a database trigger that does not set a visibility value. `appointment_notes.visibility` defaults to `clinic`, so any writer that omits it produces a clinic-visible note.

Confirmed in the database: 13,075 System notes are correctly `internal`, but 44 System notes are `clinic` — the supersede/replaced notes, cancellation-reason notes, and GHL tag-applied notes.

## The fix

The column default stays as-is. Instead:

1. **Set `visibility = 'internal'` explicitly** in every System note writer that currently omits it:
   - The supersede/replace trigger function (both the "Superseded by newer approved appointment…" note and the "Replaced N earlier appointment record(s)…" note).
   - Cancellation-reason notes (`AppointmentCard.tsx`, `DetailedAppointmentView.tsx`).
   - "GHL … tags applied" audit notes (`cancellationTags.ts`).
   - Remaining edge-function inserts that don't pass visibility (`update-ghl-contact-name`, `create-ghl-appointment`, `update-appointment-fields`, `evaluate-potential-oon`, `fetch-ghl-contact-data`, `fix-zenith-timezone-shift`, `restore-block-incident-appointments`, `ghl-webhook-handler` carry-forward rows).
2. **Backfill** the 44 existing notes where `created_by = 'System'` and `visibility = 'clinic'` to `internal`.

## What stays clinic-visible

Notes authored by a real person (status-change notes stamped with the user's name, manual clinic notes, welcome-call logs) are untouched. Only `System`-authored notes become internal-only.

## Technical notes

- `CREATE OR REPLACE FUNCTION` migration for the supersede trigger functions, adding `visibility` to both note inserts.
- Backfill runs as a data update: `UPDATE appointment_notes SET visibility='internal' WHERE created_by='System' AND visibility='clinic'`.
- No UI changes — the Internal/Clinic filter already handles both values.
