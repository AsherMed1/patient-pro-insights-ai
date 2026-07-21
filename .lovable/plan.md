## Root cause

Angela Moore's record (`760761dd`) has plenty of PFE intake data in `patient_intake_notes` — full "PFE STEP 1/2" answers, PCP name/phone, insurance provider/plan/group/ID, address — but every `parsed_medical_info`, `parsed_insurance_info`, and `parsed_pathology_info` field is null. `parsing_completed_at` was stamped at 14:49:06 with no `parsing_error`, so the AI call in `auto-parse-intake-notes` returned a shell object with only contact/demographics populated and the run was accepted as success.

Two things combined here:

1. `calendar_name = "Unknown"` (Premier Vascular unscheduled flow doesn't map a calendar), so `detectProcedureFromCalendar` returned null and the prompt never received the procedure-specific extraction guidance. With no anchor, the model produced mostly nulls.
2. The PFE keyword fallback at line 937 only rescues `procedure_type` — it does not backfill medical/insurance/pathology fields, so those stayed null even though the notes clearly contain them.

Result: parser reports success while the record is effectively empty. Same failure shape we hit before on Jovita Dodson and Emage.

## Plan

### 1. Fix Angela Moore now
Reparse `760761dd-c19d-4c7f-8bcc-100e3b211ea7` via `reparse-specific-appointments` after the code changes below so the record picks up PFE parsing and structured medical/insurance extraction. Verify `parsed_pathology_info.procedure_type = 'PFE'`, `pcp_name`, insurance provider/ID/group, address, and PFE step answers are populated.

### 2. Harden the parser against "silent empty result" on unscheduled Premier Vascular leads
In `supabase/functions/auto-parse-intake-notes/index.ts`:

- **Pre-prompt procedure detection from notes when calendar is Unknown.** Before building the prompt, if `detectProcedureFromCalendar(calendar_name)` returns null, run a light keyword scan over `patient_intake_notes` for the existing procedure signals (plantar/PFE, fibroid/UFE, knee/GAE, prostate/PAE, hemorrhoid/HAE, plantar/PFE, thyroid/TAE, neuropathy, PAD, frozen shoulder/FSE) and pass that as `calendarProcedure` into the prompt. This gives the model the same procedure-specific guidance block Premier scheduled leads already get.
- **Empty-result guard.** After the AI returns, if `parsed_pathology_info`, `parsed_medical_info`, and `parsed_insurance_info` are all effectively empty *while the notes contain STEP/Insurance/Medical section headers*, treat it as a parse failure: set `parsing_error = 'empty_result_retry'`, do not stamp `parsing_completed_at`, and let the standard retry path pick it up. This prevents future records from silently landing in the "looks parsed but blank" state.
- Keep the existing PFE keyword fallback for `procedure_type` as-is.

### 3. Verification
- Re-run parser on Angela Moore and confirm the Medical Information card renders PCP, insurance details, and the PFE step answers.
- Spot-check one previously-good Premier PFE record to make sure the calendar-Unknown fallback doesn't regress it.
- Query for any other Premier Vascular records where `parsing_completed_at IS NOT NULL` but all three parsed_* objects are empty; list them so we can decide whether to bulk-reparse.

### Technical notes
- Files touched: `supabase/functions/auto-parse-intake-notes/index.ts` only. No schema changes, no UI changes.
- No migration needed. The reparse and the sweep query run through existing tools.
