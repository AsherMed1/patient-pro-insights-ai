## Plan: Re-pull Fernando Gordillo from GHL

**Target:** appointment `1deec937-371a-409b-9da2-8593cb9e3b4a` (Fernando Gordillo, Vascular and Embolization Specialists, ghl_id `cg2JZQ5dybL7qu0nH3oj`).

### Steps

1. **Refresh GHL contact data** — invoke `fetch-ghl-contact-data` with `{ appointmentId: '1deec937-371a-409b-9da2-8593cb9e3b4a' }`. This re-pulls all custom fields from GHL, re-appends them to `patient_intake_notes`, and updates phone/email/time_preference.

2. **Force re-parse** — clear `parsing_completed_at` so the auto-parse trigger re-runs and rebuilds `parsed_insurance_info` / `parsed_medical_info` / `parsed_pathology_info` / `parsed_demographics` / `parsed_contact_info` from the freshly pulled notes.

3. **Queue insurance card fetch** — clear `insurance_id_link` on the row to (re)trigger the `queue_insurance_card_fetch` trigger, which enqueues an `insurance_fetch_queue` job. Then invoke the insurance-card processor edge function to pull the card image from GHL if one exists there.

4. **Verify** — re-query the row and confirm:
   - `parsed_insurance_info` has provider/plan/ID/group
   - `parsed_medical_info` has pcp_name (and pcp_phone/address if GHL now has them)
   - `insurance_id_link` is populated (or confirm GHL has no card uploaded for this contact, in which case there's nothing to sync)

### Out of scope
- No code changes — the renderer already displays every populated field for VES; this is purely a data-refresh operation for one contact.
- If after refresh PCP phone/address are still null, that means the GHL intake form didn't collect them (the form only has a single "Primary Care Doctor's Name and Phone" field, which the patient filled with name only). Nothing to fix on our side in that case.
