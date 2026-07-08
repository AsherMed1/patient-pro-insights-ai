## Issue

Lynda Jones (Ozark Regional Vein and Artery Center, appointment `481efb46`) has a full 2,046-char `patient_intake_notes` blob synced from GHL — including insurance ("Self-pay/Cash", Plan/Group/ID = "Self Pay"), PAD pathology answers, contact info, and DOB — but every field in `parsed_insurance_info`, `parsed_medical_info`, `parsed_pathology_info`, `parsed_contact_info`, `parsed_demographics` came back null. `parsing_completed_at` is set (Jul 2 15:17:51), so the AI parser ran but returned an empty payload — likely a transient OpenAI response on this one record.

Nothing is missing in GHL and nothing is wrong with the sync — this is a one-off failed AI parse.

## Fix

Re-run the parser for this single appointment via the existing `reparse-specific-appointments` edge function.

Steps:
1. Invoke `reparse-specific-appointments` with `appointment_ids: ["481efb46-d87b-46fc-98d8-25d525a98b21"]`. That function already:
   - Re-fetches fresh GHL contact data (no-op here since notes are already complete)
   - Resets `parsing_completed_at = null`
   - Calls `auto-parse-intake-notes` to repopulate the `parsed_*` JSONB fields
2. Verify the appointment row: `parsed_insurance_info.insurance_provider` = "Self-pay/Cash", plan/group/id = "Self Pay", `parsed_medical_info.pcp_name` = "None", pathology PAD fields populated.
3. Confirm the Patient Pro Insights panel now shows Insurance and Intake sections filled in.

No code changes, no schema changes — just triggering the existing reparse pipeline for this one appointment.

## Out of scope

- No change to parser prompt or `auto-parse-intake-notes` logic (single-record failure, not systemic).
- No backfill sweep for other Ozark leads unless you want one — I can add a follow-up to scan all Ozark appointments with non-empty notes but empty `parsed_insurance_info` and reparse them in a batch.