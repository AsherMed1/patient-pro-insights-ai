## Goal

Show a single "Affected Side" row in the Medical Information card for GAE/PFE/FSE/PAD/ATE/Neuropathy leads. Remove the duplicate "Affected Knee" row.

## Changes

1. `src/components/appointments/ParsedIntakeInfo.tsx` (lines ~1049–1058)
   - Delete the `Affected Knee` render block. Keep only the `Affected Side` block at line 1038.

2. `supabase/functions/auto-parse-intake-notes/index.ts`
   - Remove the GAE-specific mirror that writes the extracted laterality into `parsed_pathology_info.affected_knee`. Only set `affected_side`.
   - Redeploy the edge function.

## Notes

- No backfill needed — existing `affected_knee` values simply won't render anymore.
- Editing behavior for `affected_side` in the UI is unchanged.
