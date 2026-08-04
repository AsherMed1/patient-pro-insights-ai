# Why the clinic still saw a 2026 DOB — and how to close the gap

## What the record actually shows

For Michael Hoffman (ID `bca695b8`):

- 17:25:33 — Christopher Gonzalez corrected the DOB in the Review Queue: `2026-03-05` → `1967-03-05`, plus age `0` → `59`, written to the top-level `dob`, Demographics and Contact Info.
- 17:25:38 — Same person approved the appointment (prior status: pending). The portal only shows approved rows, so the clinic could not have seen the record before the correction.

So the structured DOB was fixed before approval. But the **raw Patient Intake Notes still contain the line `Date of Birth: 2026-03-05`** on that record today. That is the copy the clinic is reading — DOB corrections update the structured fields and never touch the intake-notes text.

There is a second, related risk: because the notes still say 2026, any re-parse of this record (manual refresh, GHL re-sync, parse-health sweep) can overwrite the corrected DOB back to `2026-03-05`.

## The fix

1. **Rewrite the DOB line in the intake notes when DOB is edited.** When a user saves a DOB change in the portal / Review Queue, also update any `Date of Birth: ...` / `DOB: ...` line in `patient_intake_notes` to the corrected value, so the raw notes the clinic reads agree with the header. Leave the rest of the note text untouched.
2. **Protect manually corrected DOBs from the parser.** Mark the record as having a human-verified DOB, and have the intake parser keep the existing DOB instead of re-deriving it from the notes text for those records (age recalculated from the kept DOB).
3. **Backfill the existing mismatches.** Find every appointment where the structured DOB no longer matches the DOB written in its intake notes, and repair the notes line the same way. Michael Hoffman's record is fixed as part of this pass.
4. **Flag impossible DOBs at intake.** The Review Queue already badges "Invalid DOB" for birth years at or after the current year; extend the same check so the raw-notes DOB line is included, so a bad date is caught before approval rather than after.

## Technical notes

- Edit points: the DOB save path in `src/components/appointments/AppointmentCard.tsx` and `DetailedAppointmentView.tsx` (and the Review Queue's DOB edit), which today update `dob`, `parsed_demographics`, and `parsed_contact_info`.
- Notes rewrite: regex replace on `patient_intake_notes` for `(?i)^\s*(date of birth|dob)\s*:\s*.*$`, preserving surrounding lines; skip silently when no line matches.
- Parser guard: add a `dob_verified_at` (or equivalent) column on `all_appointments`, set on manual DOB edit; `auto-parse-intake-notes` skips DOB/age overwrite when it is set.
- Backfill: one-time SQL/edge pass comparing `dob` against the DOB parsed out of `patient_intake_notes`.
- Out of scope unless you want it: pushing corrected DOBs back to the GHL contact — there is currently no portal → GHL DOB sync, so GHL still holds `2026-03-05` for this contact.
