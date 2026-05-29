# Insurance not syncing — root cause + fix

## What the data actually shows

I pulled all 4 reported appointments. Three of four already have insurance parsed and stored:

| Patient | Project | `detected_insurance_provider` | `parsed_insurance_info.insurance_provider` | Insurance card |
|---|---|---|---|---|
| Danielle Jones | FSA | Anthem Commercial (requires referral) | Anthem Commercial | — |
| Sam Johnson | STC | BCBS of Tennessee | BCBS of Tennessee | — |
| LaBerrick Williams | STC | BCBS | BCBS | — |
| **Samuel Lambert** | **STC** | **null** | **null (all fields null)** | link present |

So Sam, LaBerrick, and Danielle should already be rendering in the portal (the portal reads `parsed_insurance_info.insurance_provider` then falls back to `detected_insurance_provider`, both populated). If the user refreshes they should appear. The only truly broken record is **Samuel Lambert**.

## Why Samuel Lambert failed (and why this is a GAE‑STC pattern)

His intake text uses a different separator than the other STC GAE leads:

- LaBerrick:  `Insurance: Plan BCBS; Group#: 7NUS00; Alt Selection BCBS`
- Sam J:      `Insurance: Plan BCBS of Tennessee; Group #80860; Alt Selection BCBS`
- **Samuel L:** `Insurance: Plan=B; Group#=125000; Upload=...; Alt Selection=BlueCare`

Two problems hit at once:
1. `Plan=B` parses to a 1‑character provider — the parser stores it and never tries `Alt Selection`.
2. The `=` separator variant isn't covered by the same regexes the space‑separated form is, so the real provider ("BlueCare") in `Alt Selection=BlueCare` is dropped.

This is the GAE/STC tie the user is sensing: STC's GAE intake form occasionally emits the `Key=Value` variant, and any record where `Plan` is a stub falls through with no provider.

## Fix

### 1. Parser — `supabase/functions/auto-parse-intake-notes/index.ts` (fallback regex block)

Extend the insurance fallback so it:
- Accepts both `Plan: X`, `Plan X`, and `Plan=X` (same for `Group#`, `Alt Selection`, `Upload`).
- Treats `Plan` values shorter than 3 chars or that are a single non‑alpha token (e.g. `B`) as missing.
- When `provider` ends up empty/garbage, promotes `Alt Selection` to `insurance_provider` AND `insurance_plan` (current behavior already uses Alt Selection as a fallback for some projects; widen it to STC GAE and to the `=` format).
- Strips a trailing `Upload=https://...` block out of the insurance segment before regexing the remaining fields.

No AI prompt changes needed; this is pure regex hardening in the fallback path.

### 2. Backfill the 4 reported patients

Run `reparse-specific-appointments` (existing edge function) against:
- `3PKQ25hxXM7XPrO3mZU3` (Samuel Lambert) — will pick up BlueCare via the new Alt Selection promotion.
- `QUMYzX17sL240uX3EBZr` (Danielle Jones), `VFAqCpJEOgr5aZmb5k1b` (Sam Johnson), `LYFI6Axku9AMQvR1ZVPl` (LaBerrick Williams) — sanity re‑run so the portal cache shows fresh data and confirms the user that the records are healed.

### 3. Preventive sweep for the STC GAE backlog

One-shot SQL scan (read-only) for STC confirmed GAE appointments where `detected_insurance_provider IS NULL` AND `patient_intake_notes ILIKE '%Plan=%'`, then queue them through `reparse-specific-appointments` in a single batch. This catches any other Samuel‑Lambert‑shaped records without changing live behavior.

## What this is NOT

- Not a GHL → portal sync bug. The GHL webhook already delivered the intake notes; the failure is downstream in the regex fallback when OpenAI is rate‑limited (which it currently is — see recent edge logs: `429 insufficient_quota`).
- Not a procedure routing bug. `procedure_type=GAE` is being set correctly from the calendar name for all four.

## Out of scope (flagging only)

OpenAI quota is exhausted right now, which is why the regex fallback is doing all the work and exposing this gap. Worth topping up `OPENAI_API_KEY` billing separately — but the parser fix above means we no longer depend on the AI path for plain insurance fields.
