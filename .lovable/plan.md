## Issue

Test Johann Insurance Booked (`714f9b9d-2a48-491e-a192-194c69fdc08c`) shows empty Patient Pro Insights because the appointment's `patient_intake_notes` only contains a single line:

```
**Insurance:** insurance_id_link: https://services.leadconnectorhq.com/documents/download/VAw0zyRWa02R8b0M5zNL
```

The parser ran (`parsing_completed_at` is set) and correctly extracted nothing — there's nothing in the notes to extract. No insurance fields, no PCP, no pathology answers, no demographics beyond DOB. So this isn't a parser miss like Juan Barrientos was; the source data itself is empty on the appointment row.

The contact does exist in GHL (`ghl_id: nbMac8GehMs2tv5slGfo`), so the fix is to pull fresh contact data from GHL and re-parse — same pipeline we use elsewhere (`reparse-specific-appointments`).

## Fix

Run the standard GHL refresh + reparse for this one appointment:

1. Invoke `reparse-specific-appointments` with `{ appointment_ids: ['714f9b9d-2a48-491e-a192-194c69fdc08c'] }`. That edge function will:
   - Call `fetch-ghl-contact-data` server-to-server to pull the latest custom fields / intake blob from GHL into `patient_intake_notes`.
   - Null out `parsing_completed_at` on this row.
   - Trigger `auto-parse-intake-notes` to repopulate `parsed_insurance_info`, `parsed_pathology_info`, `parsed_medical_info`, and `detected_insurance_*`.
2. Verify with a `SELECT` that the parsed fields are populated.

## Expected outcome

- If the GHL contact actually has insurance / pathology data filled in, the portal will show it after the refresh.
- If the GHL contact is genuinely empty (this looks like a test booking — name "Test Johann Insurance Booked", DOB 2026-06-01, email `test@insurance.com`), the refresh will be a no-op and we'll report back that there's nothing on the GHL side to pull. In that case nothing more to do — the portal correctly reflects an empty intake.

## Not doing

- Not touching any other appointments.
- Not changing the parser or the intake form.
- Not writing anything back to GHL.

Confirm and I'll run it.