# Make contact-attempt notes internal-only

## What's happening

Logging a contact attempt writes a mirrored note into the appointment notes timeline, but it never says how visible that note should be. The notes table defaults to "clinic visible", so those attempt notes have been showing to clinics. Confirmed in the data: 21 attempt notes are clinic-visible, 1 internal (someone toggled it manually — that's the one in your screenshot).

## Change

1. When an attempt is logged, write the mirrored note as **Internal** so it is only visible to the team. The attempt record itself is unchanged.
2. Backfill the existing 21 clinic-visible "Contact attempt:" notes to Internal.
3. Team members keep the per-note badge toggle if they ever want to make one clinic-visible.

## Technical notes

- `src/components/appointments/LogAttemptDialog.tsx`: add `visibility: 'internal'` to the `appointment_notes` insert.
- Data-only backfill (no migration): `update appointment_notes set visibility='internal' where note_text like 'Contact attempt:%' and visibility='clinic'`.
