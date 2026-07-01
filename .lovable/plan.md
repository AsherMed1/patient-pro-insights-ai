## Bug

The Medical Information card shows `Smoking Status: Aiken | state: South Carolina | zip: 29805` for Larry Palmer. This is a parser bug, not a data-entry issue.

**Root cause** — in `supabase/functions/auto-parse-intake-notes/index.ts` line 1212, the PAD-specific enrichment runs unconditionally on every appointment and uses an overly loose regex:

```ts
const smokeMatch = intakeNotes.match(/(?:smoke|tobacco)[^:]*:\s*([^\n]+)/i);
```

Larry's address is `Smokey Cypress Loop | city: Aiken | state: South Carolina | zip: 29805`. The regex matches `Smokey Cypress Loop | city` as the label and captures `Aiken | state: South Carolina | zip: 29805` as the value, then writes it to `parsed_medical_info.smoking_status`.

Two things are wrong:
1. The regex matches any word starting with `smoke` (including `Smokey`) rather than an actual "Smoking Status" / "Tobacco Use" label.
2. Smoking status and blood thinners are PAD-only fields, but the enrichment runs for every procedure (GAE in this case).

## Fix

Edit `supabase/functions/auto-parse-intake-notes/index.ts` around lines 1208–1230:

1. **Gate the whole PAD enrichment block on procedure** — only run smoking/blood-thinner regex extraction when `parsedData.pathology_info.procedure_type === 'PAD'` (or the calendar-derived procedure is PAD). GAE/UFE/PAE/HAE/etc. skip it entirely.
2. **Tighten the smoking regex** to require an explicit label with word boundaries:
   ```ts
   /\b(?:smoking\s+status|tobacco(?:\s+use)?|smoker)\s*:\s*([^\n|]+)/i
   ```
   - Adds `\b` word boundary so `Smokey` no longer matches.
   - Requires the full label token (`smoking status`, `tobacco`, `tobacco use`, `smoker`).
   - Stops capture at `|` so pipe-delimited address fragments don't get slurped.
3. **Tighten the blood-thinner regex** the same way (`\bblood\s+thinner`, stop at `|`).

## Backfill

After the code fix, clear the bad value on Larry Palmer's appointment (`0681d550…`) so the UI stops showing it:

- `UPDATE all_appointments SET parsed_medical_info = parsed_medical_info - 'smoking_status', parsing_completed_at = NULL WHERE id = '0681d550-...'`
- Auto-parse cron re-runs within 30s; UI refreshes clean.

Optional broader sweep: find any other non-PAD appointment where `parsed_medical_info->>'smoking_status'` looks like an address fragment (contains `state:`, `zip:`, or `|`) and clear + re-parse those too.

No schema, UI, or GHL changes needed.