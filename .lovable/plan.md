## Goal
Ensure newly-arriving intake notes are parsed completely. Skip any retroactive backfill of historical records.

## Scope
- Keep the parser improvements already shipped in `supabase/functions/auto-parse-intake-notes/index.ts` (regex enrichment for Insurance Provider/Plan/ID/Group, PCP name/phone, Imaging Details, and PAE w/BPH symptoms/duration/treatments, plus the broadened GPT prompt for `<PROC> STEP N |` style questions).
- Keep the UI null-safe DOB/Age guard in `src/components/appointments/ParsedIntakeInfo.tsx`.

## What changes vs. prior plan
1. **Do not run any backfill.** No mass reset of `parsing_completed_at`, no per-project sweeps, no retroactive rewrites of `parsed_*` JSON.
2. **Delete the backfill edge function** `supabase/functions/backfill-parsed-fields/` so it can't be invoked accidentally.
3. **No UI trigger or admin button** for backfill.

## Forward-only behavior
- New appointments created via `ghl-webhook-handler` or `import-missing-leads-from-ghl` continue to set `parsing_completed_at = NULL`, which the existing 30s `useAutoIntakeParsing` cron picks up and runs through the improved parser.
- Any record already in the DB with incomplete `parsed_*` fields stays as-is unless a user manually triggers reparse on that single record (existing per-record reparse path is unchanged).

## Verification
- Create or receive one new test appointment with the standard intake template (insurance + PAE w/BPH section).
- Confirm within ~60s the Patient Pro Insights card shows provider, plan, ID, group, PCP, imaging, and PAE symptoms/duration/treatments populated.
- Confirm no historical records were touched (spot-check a known-incomplete old record stays unchanged).

## Out of scope
- Backfilling LeAnthony Hill, TEST DoNotContact, ECCO records, or any other historical rows.
- Any cron/admin job that scans for incomplete parsed fields.
