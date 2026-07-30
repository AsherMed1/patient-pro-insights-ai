## Goal

Keep OpenAI (`OPENAI_API_KEY`) as the primary parser, and fall back to the Lovable AI Gateway (`google/gemini-3-flash`) whenever OpenAI fails — so a credit-exhausted or rate-limited OpenAI account no longer silently degrades parsing to regex-only.

## What changes

### 1. Two-tier AI call in `auto-parse-intake-notes`

Wrap the current OpenAI call in a small `callAI()` helper:

```text
1. OpenAI (gpt-4o-mini / current model)  ← primary, unchanged prompt
   ↓ on 429 / 401 / 402 / 5xx / missing key / unparseable JSON
2. Lovable AI Gateway (google/gemini-3-flash) ← same system+user prompt
   ↓ on failure
3. Existing regex fallback ← last resort only
```

- Gateway call: `POST https://ai.gateway.lovable.dev/v1/chat/completions`, header `Lovable-API-Key: ${LOVABLE_API_KEY}`, same messages, JSON response.
- Log which tier produced the result (`[AUTO-PARSE] source=openai|gateway|regex`) so future failures are visible in Edge Function logs.
- Surface 429/402 from the gateway as terminal (no retry loop).

### 2. Harden the "parse succeeded" guard

Today a record gets stamped `parsing_completed_at = now()` even when insurance, medical, and pathology all come back empty. Change to: if the notes are substantive (> ~200 chars) but every semantic bucket is empty, do **not** stamp completion — leave it unparsed and increment `parse_attempts` so a later run retries it.

### 3. Regex fallback improvements (still needed as tier 3)

- Strip leading markdown (`**`, `##`) before capturing values — fixes `"** insurance_provider: MEDICARE"` garbage.
- Handle procedure-prefixed labels (e.g. `Neuropathy insurance provider:`).
- Handle curly apostrophe in `Primary Care Doctor's Name`.

### 4. Repair the affected records

- Re-parse Orlando Gonzales (`840235fc`) and verify insurance + pathology.
- Sweep records created during the OpenAI outage window whose `parsed_insurance_info` / `parsed_medical_info` / `parsed_pathology_info` are empty or contain markdown artifacts, clear `parsing_completed_at`, and re-run through the new two-tier path in batches.
- Spot-check a sample against raw notes afterwards.

## Technical notes

- No schema changes; `parse_attempts` already exists.
- `LOVABLE_API_KEY` is a managed secret — provisioned automatically if absent.
- Prompt text is shared between both tiers so output shape stays identical.
- Batch the backfill with `EdgeRuntime.waitUntil()` + delays to stay inside the 60s function limit.
