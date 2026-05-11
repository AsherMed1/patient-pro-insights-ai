## Problem

Ventra Medical patient **Daisy Andrew** (appt `5b31849b-77e2-4a99-b51b-0454fb65a12e`) is tagged as **GAE** in Patient Pro Insights, but her intake clearly indicates **UFE** (calendar Service Name = "UFE", every pathology field is "UFE STEP 1/2 | …").

### Root cause
- Calendar name is generic — `"Request Your Virtual Consultation at Great Neck, NY"` — so `detectProcedureFromCalendar()` returns `null`.
- With no calendar hint, the AI parser is free to guess and mis-classified her as GAE (likely picking up generic "duration" / "symptoms" wording).
- There is no project-level guardrail telling the parser that Ventra only offers **UFE** and **HAE**.

## Fix

### 1. `supabase/functions/auto-parse-intake-notes/index.ts`
Add a Ventra-specific procedure constraint in the parsing pipeline (applied before the AI call and after the regex fallback):

- Detect Ventra by `project_name` matching `/ventra/i`.
- For Ventra records, restrict the allowed `procedure_type` set to `['UFE', 'HAE']`.
- When the calendar name does not yield a procedure, sniff the intake notes for `"UFE STEP"` / `"Pathology (UFE)"` → `UFE`, or `"HAE STEP"` / `"Pathology (HAE)"` / `"hemorrhoid"` → `HAE`. Default to `UFE` when ambiguous (Ventra's primary service).
- Pass this constraint into the AI `procedureContext`: explicitly instruct the model that for Ventra, `procedure_type` MUST be either `UFE` or `HAE` and to ignore any GAE/PAE/PAD/FSE/TAE clues.
- After the AI returns, if `parsed_pathology_info.procedure_type` is anything other than `UFE`/`HAE` for a Ventra record, override it with the sniffed value (defaulting to `UFE`).
- Mirror the same restriction in the regex fallback block (lines ~586-602) so Ventra records can never be tagged GAE/PAE/etc.

### 2. Migration — re-parse the affected record
Single migration that nullifies `parsing_completed_at` for Daisy Andrew so the auto-parser picks her up on the next cron run (and any other Ventra appointments currently tagged with a non-UFE/HAE procedure):

```sql
UPDATE all_appointments
SET parsing_completed_at = NULL,
    updated_at = now()
WHERE project_name ILIKE '%ventra%'
  AND (parsed_pathology_info->>'procedure_type') NOT IN ('UFE', 'HAE');
```

### 3. Memory
Add a project memory note `mem://projects/ventra/procedure-scope` recording that Ventra Medical only offers UFE and HAE, so future parser/UI work respects this constraint.

## Out of scope
- No UI changes — Patient Pro Insights will refresh automatically once the record is re-parsed.
- No GHL webhook changes.
- No changes to other projects' procedure detection.
