## Scope change

Instead of reparsing all 85 affected records, only reparse Walter Pitts (`e984a7c9-eef9-4134-a9d5-73c797a5e3c3`). Keep the code-level fix so this stops happening for future GHL syncs.

## Root cause (already confirmed)

Walter's `patient_intake_notes` include the full "OpenAI Prompt: Role: You are a 32-year-old ... front desk staff" bot instructions plus `Intro Message:` / `AI Status:` leftovers from GHL. When those are forwarded to our parser LLM they act as a prompt injection — the model latches onto Ashley's booking instructions and returns nulls for Insurance / Pathology / Medical even though those structured sections are present above. `stripPatientIntakeSummary` currently only removes the `Patient Intake Summary:` blob.

## Plan

### 1. Harden `supabase/functions/auto-parse-intake-notes/index.ts` (already edited this session)
Extend `stripPatientIntakeSummary` so before either the LLM call or the regex fallback we also remove:
- Everything from the first `OpenAI Prompt:` onward (matches the UI's existing truncation rule).
- Standalone `Intro Message:` and `AI Status:` lines.

Idempotent regex no-ops for notes that don't contain those markers. Applied to all three existing call sites (lines 461, 902, 2818).

### 2. Deploy the updated edge function
`supabase--deploy_edge_functions(["auto-parse-intake-notes"])`.

### 3. Reparse Walter Pitts only
Reset `parsing_completed_at` to NULL for `id = 'e984a7c9-eef9-4134-a9d5-73c797a5e3c3'`, then invoke `auto-parse-intake-notes` (or `trigger-reparse` with `appointment_id`) so the parser re-runs with the new sanitizer and populates `parsed_insurance_info`, `parsed_pathology_info`, and `parsed_medical_info`.

### 4. Verify
Re-query Walter Pitts and confirm Insurance (Anthem BCBS / plan / group `NYMCRWP0` / ID `e6d818w15003`), Pathology (duration, pain 10/10, symptoms, imaging, treatments, affected side Both), and Medical (PCP: Dereck Birmingham) are populated. Do not touch any other records.

## Technical details

- Only one file touched: `supabase/functions/auto-parse-intake-notes/index.ts`.
- No schema changes, no UI changes, no changes to Review Queue or QA modules.
- No bulk backfill — the other 84 rows stay as-is until you say otherwise.

## Out of scope
- Reparsing the other 84 records with the same pattern.
- Any upstream GHL/Liberty cleanup (that's a separate conversation).
