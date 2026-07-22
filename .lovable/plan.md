## Root cause (verified for Walter Pitts, id `e984a7c9…`)

His `patient_intake_notes` clearly contains all the data:
- Insurance Information (Anthem BCBS, Plan BCBS, Group `NYMCRWP0`, ID `e6d818w15003`)
- Pathology Information (GAE STEP 1/2 with duration, pain 10/10, symptoms, imaging, treatments)
- Medical Information (PCP: Dereck Birmingham)

But the parsed JSON is almost entirely `null` — only `procedure_type: GAE`, `parsed_contact_info`, and `parsed_demographics` came through. `parsing_completed_at` is set (no error thrown), so the AI parser ran and returned mostly nulls.

Reason: the notes also contain a massive `OpenAI Prompt: Role: You are a 32-year-old ... front desk staff ...` block (Ashley bot instructions) plus `Intro Message:`, `AI Status:`, and `Patient Self-Reported Summary:`. That block is a live LLM prompt injection — when we forward the whole notes to our parser LLM, the model latches onto Ashley's instructions ("book appointment", "no medical advice", 300-char limit, etc.) and stops extracting the structured fields below/around it. The existing sanitizer only strips `Patient Intake Summary:` and does nothing about `OpenAI Prompt:`.

This matches the memory rule that the UI already truncates notes at `OpenAI Prompt:` — the parser needs the same guard.

Confirmed scope: **85 appointments** currently have `OpenAI Prompt:` in notes AND null `insurance_provider` in parsed insurance. Liberty Joint & Vascular is the most affected project.

## Plan

### 1. Harden `supabase/functions/auto-parse-intake-notes/index.ts`
Extend `stripPatientIntakeSummary` (or add a sibling `stripPromptInjection`) so that, before the notes are sent to the LLM AND before regex fallback, we remove:
- Everything from the first `OpenAI Prompt:` line to end-of-notes (this is the biggest offender — matches the UI's existing rule).
- Standalone `Intro Message:` line and `AI Status:` line (both are bot-config leftovers, not patient data).
- Optionally trim a trailing `Patient Self-Reported Summary:` paragraph only when the structured `Pathology Information:` block is present above (keeps it as a fallback for records that lack structure).

Apply the new stripper in all three call sites already using `stripPatientIntakeSummary` (lines 461, 902, 2818).

### 2. Reparse affected records
After deploy, run a targeted reparse for the 85 rows matching `patient_intake_notes ILIKE '%OpenAI Prompt:%' AND parsed_insurance_info->>'insurance_provider' IS NULL` (including Walter Pitts) via the existing `reparse-specific-appointments` edge function so their `parsed_insurance_info` / `parsed_pathology_info` / `parsed_medical_info` populate.

### 3. Verify
Re-query Walter Pitts (`e984a7c9…`) and 2–3 other Liberty leads to confirm insurance, pathology, and PCP now appear. Spot-check the portal UI for the Liberty project.

## Technical details

- No schema changes, no UI changes, no changes to the Review Queue or QA modules.
- Only `supabase/functions/auto-parse-intake-notes/index.ts` is edited; the edge function auto-deploys.
- Reparse uses the existing invocation path — no new function.
- Sanitizer is idempotent and safe for notes that don't contain the injection markers (regex no-op).

## Out of scope

- Asking GHL/Liberty to stop sending the Ashley bot prompt inside contact notes (upstream cleanup — can be raised separately).
- Any change to how notes are stored; we only sanitize what we hand to the LLM/regex parser.
