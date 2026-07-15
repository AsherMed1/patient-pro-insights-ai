## Goal
Prevent the two bugs that hit Jovita from happening on future leads, with zero risk to existing data.

## Root causes recap
1. AI parser scraped `pain_level: 478` from her phone number `(478) 998-…` instead of the pain scale answer `10`.
2. My earlier GAE-STEP regex safety net matched the wrong line — the *"Did your symptoms begin after a recent trauma…"* line — and wrote `❌ NO` into the Symptoms field.

## Fix (single file: `supabase/functions/auto-parse-intake-notes/index.ts`)

All changes are inside the existing `if (/GAE\s*STEP\s*\d/i.test(intakeNotes)) { … }` block, so they only run on GAE-STEP-formatted intakes. No other procedure paths are touched.

1. **Tighten the Symptoms regex** so it only matches the correct line:
   `GAE STEP 2 | (Describe the symptoms … | symptoms you're experiencing | What symptoms are you experiencing) : …`
   Reject the match if the captured value starts with `yes / no / ❌ / ☑️`.

2. **Sanitize an already-bad Symptoms value.** If the model returned a Symptoms value that starts with `yes / no / ❌ / ☑️` and the regex above didn't produce a better value, set `symptoms = null` (blank is safer than misleading garbage).

3. **Harden pain-level extraction against phone-number scraping:**
   - Prefer the STEP 2 pain-scale line explicitly ("scale of 1-10" / "how severe is your pain" / "pain level").
   - Existing 0–10 clamp stays in place; if the AI value is outside 0–10 (like `478`), drop it to null.
   - Add a small guard: never accept a pain value that appears inside a phone-number-looking substring (e.g. `(478)` or `478-`).

4. **Log a `[AUTO-PARSE GAE]` line** for each override / drop so we can see it in edge logs if it ever misbehaves again.

## Safety guarantees
- No database migrations.
- No changes to any existing data. No re-parse triggered.
- Only runs on new/future parses (and only when notes contain "GAE STEP N |").
- Worst-case behavior: a field goes blank instead of wrong. No field gets silently overwritten with something worse than it is today.
- No touch to top-level columns (DOB, phone, email, appointment date/time, status, IPC).
- No changes to any other procedure's parsing logic (PAE, UFE, HAE, PAD, PFE, Neuropathy, ATE, etc.).
- No changes to the review-queue, EMR queue, GHL webhook, or any other edge function.

## What's explicitly NOT in this plan
- No sweep of the 5 existing bad Symptoms rows (Janice / Sam / Jeanette / Cassius / Delois). They stay as-is until you ask.
- No change to Jovita's row (already backfilled).
- No secrets, migrations, or new tables.

## Verification after build
- Read back the changed lines in `auto-parse-intake-notes/index.ts` to confirm only the GAE block moved.
- No re-parse call. Fix applies naturally to the next new GAE lead.