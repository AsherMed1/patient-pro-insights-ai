## Problem

In TVI (and other projects using GHL's "Patient Intake Summary" custom field), the Medical Information and Insurance sections are filled with raw template field labels like:

> "Over 1 year OA Diagnosis: ☑️ YES Age: 46 to 55 ... PAE Info No fields found... UFE Info Period Length: ... PFE Info Morning Pain: ❌ NO ..."

Confirmed for Anita Hartford (PFE) and Roshanda Spears (GAE), and **128 appointments project-wide** have the same corruption.

## Root cause

GHL sends a custom field named **"Patient Intake Summary"** that is a single-line concatenation of every procedure's template (GAE Info / PAE Info / UFE Info / PFE Info / etc.), with double-space separators and no newlines or pipes. Empty fields render as `Label:` with no value, immediately followed by the next label.

The fallback regexes in `auto-parse-intake-notes/index.ts` are:
- `/Duration:\s*([^\n|]+)/i` (line 557)
- `/Symptoms:\s*([^\n]+)/i` (line 573)
- `Insurance Phone:`, `Insurance ID:`, etc.

Because the blob has no `\n` or `|`, these patterns greedily slurp the rest of the line — pulling every subsequent label/value pair into a single field. The structured `Pathology Information:` section above (with proper `PFE STEP 1 | ...` lines) has the correct data, but the fallback overwrites it with garbage.

Result:
- `parsed_pathology_info.duration` = "Over 1 year  OA Diagnosis: ☑️ YES  Age: ... PFE Info Morning Pain: ..."
- `parsed_pathology_info.symptoms` = "Constipation:   Intercourse Pain: ... PFE Info ..."
- `parsed_insurance_info.insurance_provider` = "  Insurance Phone:   Insurance ID: OOP  Group Number: ..."

## Fix

### 1. Sanitize intake notes before fallback regex parsing

In `supabase/functions/auto-parse-intake-notes/index.ts`, add a sanitizer that strips the `Patient Intake Summary: ...` blob from the intake notes string before fallback regex extraction runs. The structured `Pathology Information:` and `Insurance Information:` sections above the blob already contain the same data in a parser-friendly format (one field per line, with proper STEP labels), so removing the blob loses no information.

Strip pattern: from `Patient Intake Summary:` up to the next known field label on a new line (e.g., `Booked Tag Added Date:`, `Date Appt Booked For:`, or end of "Additional Information" block) — or simpler, remove from `Patient Intake Summary:` to the next `\n  [A-Z][^:]*:` (next two-space-indented GHL field).

### 2. Tighten the fallback regexes as defense-in-depth

Update Duration / Symptoms / Insurance fallback patterns so they stop at:
- Newline (existing)
- Pipe (existing for Duration)
- Two-or-more consecutive spaces followed by a capitalized label (`\s{2,}[A-Z][A-Za-z ]{0,30}:`)

This way, even if a similar blob appears in the future, fields stay scoped.

### 3. Sanitize already-corrupted parsed JSON on display (optional safety net)

Add a quick sanitizer in the `AppointmentCard` Medical Information render that, if a value contains tokens like `OA Diagnosis:`, `PAE Info`, `UFE Info`, `PFE Info`, `Morning Pain:`, truncates at the first such marker. Keeps the UI clean even before re-parse completes.

### 4. Reparse the 128 affected appointments

After deploying the fix, invoke the existing `reparse-specific-appointments` edge function (or equivalent) for the 128 appointments matching:

```sql
patient_intake_notes ILIKE '%Patient Intake Summary:%'
AND (
  parsed_pathology_info->>'duration' ILIKE '%OA Diagnosis%'
  OR parsed_pathology_info->>'symptoms' ILIKE '%Info%'
  OR parsed_insurance_info->>'insurance_provider' ILIKE '%Insurance Phone%'
)
```

This will rebuild `parsed_pathology_info` and `parsed_insurance_info` from the structured Pathology/Insurance sections.

## Files to change

- `supabase/functions/auto-parse-intake-notes/index.ts` — add `stripPatientIntakeSummary()` helper, call it at the top of fallback regex extraction; tighten Duration/Symptoms/Insurance regexes.
- `src/components/appointments/AppointmentCard.tsx` (or whichever sub-component renders Medical Information / Insurance values) — optional display-time sanitizer.
- New migration / one-off invocation — trigger reparse for the 128 affected rows.

## Memory updates

Add a memory entry under `mem://integrations/ghl-patient-intake-summary-blob-sanitization` documenting that the GHL "Patient Intake Summary" custom field is a flat blob containing every procedure template and must be stripped before fallback regex parsing.

## Out of scope

- No changes to the AI/structured-STEP parsing path (already correct).
- No changes to GHL ingestion logic — the field still imports, just gets neutralized before regex fallback.
