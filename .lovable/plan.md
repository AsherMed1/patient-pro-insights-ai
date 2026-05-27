## What's wrong

Horace Jackson's appointment in GHL is **Jun 10, 2026 10:00 AM ET**. In the portal it shows **6:00 AM** — exactly a 4-hour shift (EDT offset).

The record was created on May 26 by the `import-missing-leads-from-ghl` edge function that I ran when adding the 31 missing CSV patients. That function calls GHL's contact-appointments API, takes the `startTime`, and converts it into the project's timezone (America/New_York for Georgia Endovascular).

The bug: GHL's contact-appointments endpoint returns `startTime` as a naive local string like `"2026-06-10T10:00:00"` (no offset). `new Date(...)` parses that as UTC = 10:00 UTC. We then format it in `America/New_York` and get `06:00`. That's how 10 AM ET became 6 AM ET in our DB.

The regular GHL webhook (`ghl-webhook-handler`) has a different but related issue — it uses `toLocaleTimeString` without `timeZone`, so it formats in the Deno server's UTC. For Horace this didn't apply because the import created the row, not a webhook.

## Fix

**1. `supabase/functions/import-missing-leads-from-ghl/index.ts` (lines 185-195)**

Treat GHL's `startTime` as already being in the project's local timezone, not UTC. Parse the wall-clock components directly from the string instead of going through `new Date()` + timezone conversion.

Approach:
- If `startTime` matches `YYYY-MM-DDTHH:mm:ss` with no `Z` and no `±HH:mm` offset → take the date and time parts verbatim (this is the GHL contact API's behavior).
- If it has an explicit offset/`Z` → keep the current `Intl.DateTimeFormat` conversion into project tz (that path is already correct).

**2. Backfill the affected rows**

Re-run a one-shot script (or a small SQL update) to correct `requested_time` for the rows created by the May 26 import. I'll generate a list of impacted IDs first (the 27 approved + 4 newly-approved patients from the CSV) and adjust each by `+4h` (or whatever each project's tz offset is on the appointment date) only where the GHL value still disagrees. We'll verify Horace Jackson goes from `06:00` → `10:00` before applying broadly.

**3. (Recommended, separate) `ghl-webhook-handler` extract functions (lines 490-499 and 536-545)**

Pass `timeZone: project.timezone` to `toLocaleTimeString`, or look up project timezone before formatting. This isn't what broke Horace, but it's the same class of bug and will bite us on future webhook-created appointments. I'd like to do this in the same PR — confirm if you want it included.

## Verification

- Re-query Horace Jackson: `requested_time` should be `10:00:00`, UI should show `10:00 AM`.
- Spot-check 2-3 other CSV patients across different timezones (Texas Endovascular = America/Chicago, Vascular Institute of Michigan = America/Detroit, etc.).
- Confirm no double-shift on records whose `startTime` did include an offset.

## Question before I build

Do you want me to also fix the `ghl-webhook-handler` timezone bug in this same change (item 3), or scope this PR strictly to the import path + backfill?
