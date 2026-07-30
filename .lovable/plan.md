## Goal
Re-parse 98 patient records that currently have empty or corrupted parsed intake sections, without altering appointment status, review status, dates, or other sensitive workflow fields.

## What will happen
1. Run a one-time SQL update that sets `parsing_completed_at = NULL` on the 98 identified records.
2. The existing `auto-parse-intake-notes` Edge Function will pick them up on its next run(s).
3. The parser will re-extract intake data using the current two-tier AI logic (OpenAI → Lovable AI Gateway/Gemini fallback) and improved regex fallback.

## Fields that may be updated
- `parsed_demographics`
- `parsed_contact_info`
- `parsed_insurance_info`
- `parsed_pathology_info`
- `parsed_medical_info`
- Top-level `dob` (only if a valid DOB is found)
- `detected_insurance_provider`, `detected_insurance_plan`, `detected_insurance_id`
- `insurance_id_link`, `insurance_back_link` (only if valid URLs are found)
- `parsing_completed_at`, `parse_attempts`
- `patient_intake_notes` only to strip stale procedure-specific STEP lines if applicable

## Fields that will NOT be updated
- `status`, `review_status`, `internal_process_complete`
- `date_of_appointment`, `start_time`, `end_time`
- `project_name`, `lead_name`, `ghl_appointment_id`, `ghl_contact_id`
- `is_superseded`, terminal-status flags, QA flags
- Any user/role/permission fields

## Safety measures already in the parser
- Non-null merge logic preserves existing values when the AI parse returns nulls.
- Corrupted insurance values (URLs, prompt fragments, markdown artifacts) are sanitized before storage.
- `parse_attempts` is incremented and capped so records don't loop forever.
- No status or review-status transitions are performed by the parser.

## Verification
After the parser runs through the backlog, I will sample a few records (including Samara Valle and Orlando Gonzales if still affected) to confirm the parsed cards are populated and no status/date fields changed.