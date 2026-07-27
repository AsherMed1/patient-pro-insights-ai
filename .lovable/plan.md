## Problem

Kurt Merolla has two records in Georgia Endovascular:

- `0a5c976c` — Cancelled, Jul 27 appt — parsed correctly (insurance, PCP, pathology all present).
- `0aeb425d` — Scheduled, Jul 31 appt (the live one shown in the portal) — parsed badly on Jul 17:
  - `insurance_provider` = `"** insurance_provider: Ambetter Peach State"` (markdown header slurped in)
  - `insurance_plan` = `"U9505227801"` (the ID number, not the plan)
  - `insurance_id_number` = empty
  - `pcp_name` / `pcp_phone` = empty (notes clearly have Dr. Dana Cole / 770-870-1780)
  - Pathology only has `procedure_type: FSE`; side, duration, pain level, treatments, imaging all empty
  - `imaging_details` empty despite "Had Imaging Before?: Yes, X-rays"

The intake notes on this record are complete — this is a parse failure, same markdown-slurp/empty-parse class already patched for other records.

## Fix

1. Force a re-parse of `0aeb425d` via `auto-parse-intake-notes` with `forceAppointmentId`, so the current hardened parser rewrites the record from its own notes.
2. Verify output, then apply a targeted SQL correction for anything still wrong or missing, using values straight from the notes:
   - Insurance: provider Ambetter Peach State, plan Ambetter Peach State, ID `U9505227801`, plus the optional intake note text as insurance notes
   - Medical & PCP: Dr. Dana Cole, 770-870-1780; imaging details "Yes, X-rays; MRI with contrast scheduled for July 30"
   - Pathology (FSE): affected side Right, area shoulder, duration Less than 3 months, pain level 4–6, worse at night yes, difficulty with shoulder movement yes, no recent injury/surgery, imaging done No (at time of intake), previous treatments Surgery / Physical therapy / Cortisone injections / Oral medications with no long-term relief
   - Clear the `** insurance_provider: ...` markdown junk
3. Leave the Cancelled `0a5c976c` record as-is (already correct, and it is not client-facing).

## Technical notes

No app code changes are needed — the parser hardening for markdown slurp and empty-parse is already in place; this record predates it (parsed Jul 17). Work is one edge-function invocation plus one data migration scoped to a single appointment id.
