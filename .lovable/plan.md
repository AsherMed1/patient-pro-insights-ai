No further changes needed.

The multi-line Notes fix from the previous turn already applies to all future appointments:

- `supabase/functions/auto-parse-intake-notes/index.ts` runs on every new/updated intake. The new patterns (`[\s\S]+?` with a next-label lookahead) will capture the full multi-line "Notes (Example: ...)" block for any incoming GHL appointment, not just Judith's record.
- `src/components/appointments/ParsedIntakeInfo.tsx` renders the captured value with `whitespace-pre-wrap`, so line breaks display correctly for every record.

No code or migration changes required. Awaiting confirmation before doing anything else.