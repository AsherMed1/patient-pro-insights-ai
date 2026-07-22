## Goal
Make Date of Birth editable in the "View Patient Record" panel (Demographics section of `ParsedIntakeInfo`) opened from the QA Operations Queue drawer.

## Scope
`src/components/appointments/ParsedIntakeInfo.tsx` — Demographics card only. No changes to QA Operations code; the QA drawer already renders `DetailedAppointmentView`, which embeds this component with `appointmentId` set, so the same edit affordance is reused everywhere the patient record is opened.

## Changes

1. **Add edit affordance to the Demographics card** (mirror the Contact Information card pattern already in this file):
   - Pencil button in the card header when `appointmentId` is present and not editing.
   - Check/X buttons while editing, with `Loader2` during save.
   - Local state: `isEditingDemographics`, `isSavingDemographics`, `editDemographics` (`{ dob, gender }`).

2. **Editable fields**: Date of Birth (date input, `yyyy-MM-dd`) and Gender (text input). Age is not editable — it is always recalculated from DOB per the "Age Calculation" core rule.

3. **Save handler** — write both surfaces in one Supabase update to satisfy the "Field Editing Sync" and "DOB Fallback Display" core rules:
   - Top-level `all_appointments.dob` = new DOB (or null if cleared).
   - `parsed_demographics` JSONB merged with `{ dob, age: recalculated, gender }`.
   - Also mirror `dob` into `parsed_contact_info.dob` if that object exists (some legacy rows read from there — matches existing fallback chain on line 525).
   - On success: toast, exit edit mode, call the existing `onDataUpdate` callback so the parent (DetailedAppointmentView / QA drawer) refetches.
   - On failure: toast error, keep edit mode open.

4. **Validation**: reject future dates and today (reuse the existing `isValidDOB` logic already in the Demographics block). Empty input allowed → stores null.

## Out of scope
- No GHL two-way sync for DOB in this change (DOB isn't currently synced outbound from the portal; adding that would be a separate feature).
- No changes to QA drawer, activity log, or triggers.

## Verification
- Open QA Operations → click a case → "View patient record" → edit DOB → save → confirm the value persists after reopening and that Age recalculates.
- Confirm the same pencil now also appears on the Demographics card in the standard Project Portal detailed view (same component, expected).