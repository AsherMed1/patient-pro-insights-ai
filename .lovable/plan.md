## Problem

Horizon Vascular Specialists sends leads without a calendar/date (Morning/Afternoon preference only), same pattern as ECCO, Premier Vascular, and Davis Vein & Vascular. But `ghl-webhook-handler` only whitelists the other three:

```ts
const UNSCHEDULED_PROJECTS = new Set(['premier vascular', 'ecco medical', 'davis vein & vascular']);
```

So Horizon's no-date payload likely falls through the normal path where a missing `date_of_appointment` gets filtered out — the lead never becomes a Needs Review row and is invisible in the project portal.

## Fix

1. **`supabase/functions/ghl-webhook-handler/index.ts`** — add `'horizon vascular specialists'` to both allowlists:
   - `UNSCHEDULED_PROJECTS` (create path, ~line 1042)
   - `UNSCHEDULED_PROJECTS_UPDATE` (update path, ~line 1090)
   
   This makes Horizon leads:
   - Store `is_unscheduled=true`, `date_of_appointment=null`, `time_preference` from intake notes
   - Bypass the date-required filter and land in Review Queue → project portal Needs Review / Unscheduled tabs

2. **Verify the canonical project name** in the `projects` table matches `Horizon Vascular Specialists` (the console log confirms this spelling).

3. **Backfill the missing test lead**: query `all_appointments` / raw webhook for the user's Horizon test payload received today. If it landed with a NULL project or was dropped, either re-parse it or ask the user to re-fire the webhook so the new logic ingests it.

4. **Memory update**: add a new memory `mem://projects/horizon-vascular-specialists/unscheduled-capture` and reference it in `mem://index.md` alongside the existing ECCO/Premier/Davis entries, so future edits keep Horizon in the allowlist.

## Not changing

- UI (Review Queue, Needs Review tab, Unscheduled tab already handle `is_unscheduled=true` rows)
- Contact-notes-only guard (unchanged)
- Any other project's routing

## Question

Do you want me to also check for and recover the specific Horizon test lead you just sent (I'll search recent webhook logs / `all_appointments`), or will you re-fire it after deploy?
