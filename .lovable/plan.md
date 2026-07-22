## Problem

`qa_cases.patient_name` is a snapshot captured when the case was created. Nothing updates it when `all_appointments.lead_name` changes, so QA Operations keeps showing the old name even after the Portal→GHL sync succeeds.

## Fix

Extend `supabase/functions/update-ghl-contact-name/index.ts` so that after it updates the target appointment and its siblings, it also updates every matching `qa_cases` row.

Update logic (service role, runs after DB writes succeed):

1. Update `qa_cases` where `appointment_id = appointment_id` → set `patient_name = trimmedName`.
2. If `appt.ghl_id` is present, also update `qa_cases` where `ghl_contact_id = appt.ghl_id` → set `patient_name = trimmedName` (covers sibling appointments' cases).
3. Include the counts in the response (`qa_cases_updated`) for debugging; no UI change required — QA Queue already realtime-subscribes to `qa_cases` and will refresh automatically.

No schema change, no trigger, no other file edits. Purely additive within the existing edge function so the QA drawer reflects the new name the moment the sync completes.

## Result

Editing a name from either Project Portal or QA Operations now updates:
- GHL contact
- All sibling `all_appointments` rows
- All linked `qa_cases` rows (via appointment_id and ghl_contact_id)

QA Operations Queue reflects the new name in realtime.
