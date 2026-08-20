# Prospero TEST (2d0c9e5c) — why the parse came back empty

## What actually happened (verified)

- The record was created 16:20:56 UTC and only got parsed data at 19:15:34 UTC — right when a human forced a reparse. Every other appointment created in the last two days parsed within ~10 seconds, so this was not general slowness.
- Edge logs from the 19:13–19:15 reparse show the cause plainly: the OpenAI call returns **429 `credit_balance_exhausted` — "You have no credits remaining"**. The OpenAI key on this project is out of credit, so every parse now depends on the Lovable AI Gateway fallback (Gemini). At 19:13 the gateway answered and the record parsed fine.
- At 16:20 the gateway leg evidently did not produce usable output either (its logs are past retention), so the payload came out empty.
- The parser has an empty-parse guard: rich notes + empty payload leaves `parsing_completed_at` NULL and increments `parse_attempts`, but **after 5 attempts it gives up and stamps the record as parsed anyway**. Those 5 attempts are consumed within seconds/minutes because auto-parse runs on every webhook and on a client poll — there is no backoff. Once stamped, the record is invisible to every retry path, which is exactly why it sat blank for 3 hours until a manual reparse (`parse_attempts` is back to 0 because a successful parse resets it).
- This is not a one-off: **37 appointments** (4 in the last 7 days) are currently stamped "parsed" while their notes contain an Insurance Information block and no insurance was extracted.

## Fixes

### 1. Restore the primary AI provider
Top up / replace `OPENAI_API_KEY`, or explicitly demote OpenAI and make the Lovable AI Gateway the primary parser so parsing does not depend on a dead key with a silent fallback. Add a distinct log line and a one-time alert when the primary provider returns a quota error, so this is visible instead of buried.

### 2. Stop burning retries on provider outages
In `auto-parse-intake-notes`, separate two failure kinds:
- **Provider failure** (429/5xx/no content from both OpenAI and the gateway): do not count toward `parse_attempts`, never stamp `parsing_completed_at`, and record the reason.
- **Genuine unparseable notes** (provider answered, payload still empty): count the attempt as today.

Add spacing between retries (a `next_parse_attempt_at` timestamp, e.g. 1m/5m/15m/1h) so the 5-attempt budget covers hours, not seconds.

### 3. Never fail silently
Persist the last parse outcome on the row (`parse_status` + `last_parse_error`), and surface it in the portal/Review Queue as a small "Parsing failed — retry" indicator with a retry button, so nobody has to notice an empty record by eye.

### 4. Self-heal the stuck records
Broaden the existing sweep so it catches records stamped parsed with an empty payload using the same rich-notes test the guard uses (today the sweep only matches notes containing `Insurance ID Number:`), and run it on a schedule. Then requeue the 37 affected appointments once the AI provider is healthy and report how many recovered.

## Technical notes

- `supabase/functions/auto-parse-intake-notes/index.ts`: `callAI` returns `source: 'openai' | 'gateway' | 'none'`; propagate `'none'` into the empty-parse guard so it is treated as a provider failure. Guard block sits at ~lines 3591–3647; sweep query at ~2984.
- `supabase/functions/ghl-webhook-handler/index.ts` invokes auto-parse with `{ appointment_id }` while the parser reads `appointmentId` — the targeted force-reparse never actually targets. Fix the key name while in here.
- Migration: add `parse_status text`, `last_parse_error text`, `next_parse_attempt_at timestamptz` to `all_appointments` (nullable, no backfill needed).
- No client-facing behaviour changes beyond the failure indicator.
