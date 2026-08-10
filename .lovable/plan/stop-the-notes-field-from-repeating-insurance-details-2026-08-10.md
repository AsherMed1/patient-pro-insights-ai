# Stop the Notes field from repeating insurance details

## What's happening

For Champion Test (Champion Heart and Vascular Center), GHL only contains:

```text
Notes (Example: Imaging, Secondary, etc.) - Optional: Both Legs are an issue
Insurance Plan (2): BCBS
Insurance ID Number (2): 9868HJA99A
Insurance Group Number (2): 51561
```

But the stored `insurance_notes` (shown as "Notes:" in the Medical Information card) reads:

```text
Both Legs are an issue; Secondary insurance: BCBS, ID Number: 9868HJA99A, Group Number: 51561
```

The secondary plan/ID/group were already captured correctly into their own secondary insurance fields. The AI parser appended a restatement of them into the Notes value, because the parser prompt explicitly tells it to fold "secondary insurance info" into `insurance_notes`. So the Notes line duplicates data that already has its own dedicated fields.

## Fix

1. **Parser prompt** (`auto-parse-intake-notes`): redefine `insurance_notes` as a verbatim copy of the intake form's generic "Notes" field only. Explicitly forbid summarizing, restating, or appending secondary insurance plan / ID / group values — those belong in the secondary insurance fields.

2. **Deterministic override**: when the raw intake notes contain a `Notes (Example: ...)` / `Notes:` field, that captured text becomes authoritative for `insurance_notes` instead of only filling in when the AI left it blank. This makes the field exactly what the setter typed.

3. **Duplicate stripper**: before saving, remove trailing fragments such as `Secondary insurance: ...`, `Insurance Plan (2): ...`, `ID Number: ...`, `Group Number: ...` from `insurance_notes` when those same values are already present in `secondary_plan` / `secondary_id_number` / `secondary_group_number`. Only strips confirmed duplicates; anything the setter wrote that isn't a duplicate stays.

4. **Display safety net** (`ParsedIntakeInfo.tsx`): apply the same duplicate-stripping to the rendered Notes line, so records already stored with the merged text display cleanly without waiting for a re-parse.

5. **Verify**: re-check Champion Test so the Notes line reads `Both Legs are an issue` while the Secondary Insurance section keeps BCBS / 9868HJA99A / 51561.

## Technical notes

- Files: `supabase/functions/auto-parse-intake-notes/index.ts` (prompt around the `insurance_notes` schema line, the regex enrichment block, and the pre-save sanitize step), `src/components/appointments/ParsedIntakeInfo.tsx` (existing `cleaned` transform for `insurance_notes`).
- No schema changes. Existing rows are cleaned at display time; a targeted re-parse of affected records can be run afterwards if you want the stored values corrected too.
