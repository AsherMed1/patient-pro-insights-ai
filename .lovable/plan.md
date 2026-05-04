## Issue

Ally Vascular intake forms include TWO insurance fields from GHL:

1. A screening question: `Please select your GAE insurance provider: Medicare` (a category bucket — used to qualify the lead)
2. The actual carrier: `Insurance Provider: HealthSpring` (or Humana, Mutual of Omaha, UHC, etc.)

The parser is choosing the screening answer (Medicare) and overwriting the real carrier. Confirmed in DB — many Ally appointments show `detected_insurance_provider = "Medicare"` while `parsed_insurance_plan` holds the real plan name (e.g. Pam Youngblood → Medicare / Mutual of Omaha Plan N; Wilma Gonzales → Medicare / United Healthcare; Dean Gutierrez → Medicare / Humana PPO).

## Root cause (`supabase/functions/auto-parse-intake-notes/index.ts`)

Two code paths both pick the screening field:

1. **Regex fallback (~line 343)** — pattern `/insurance provider:\s*([^\n|]+)/i` returns the FIRST match in the notes. The screening line "...select your GAE insurance provider: Medicare" appears before "Insurance Provider: HealthSpring", so Medicare wins.
2. **GHL field iterator (~line 1102)** — condition `key.includes('insurance') && key.includes('provider')` matches both fields with no priority, so order-of-iteration determines the winner and the screening field can clobber the real one.

## Fix

Edit `supabase/functions/auto-parse-intake-notes/index.ts`:

**A. Regex fallback for `insurance_provider`**
- Add a high-priority pass first: match a line that starts with `Insurance Provider:` (anchored, not preceded by "select" / "please" / "GAE" / "PAE" / "UFE" / "HAE" / "PAD" / "neuropathy"). Use this when present.
- Only fall back to the generic `/insurance provider:/i` and `/Please select your insurance provider:/i` patterns when no explicit "Insurance Provider:" line exists.
- Same precedence applied to `insurance_plan` (real plan label > screening category).

**B. GHL field iterator**
- Detect screening keys: keys containing `select` AND (`insurance` AND `provider`), or matching `your <procedure> insurance provider`. Treat these as low-priority "screening" hints — only assign if no real `Insurance Provider` field has been seen.
- Real key (exact `insurance provider` / `insurance_provider` without "select"/"please"/"your") always wins, regardless of iteration order.
- Mirror the same logic for `insurance_plan`.

**C. Backfill existing records**
- One-time data fix: for `all_appointments` where `project_name ILIKE '%ally%'` AND `detected_insurance_provider ILIKE 'medicare'` AND `parsed_insurance_plan` contains a different real carrier (Humana, UHC/United, Mutual of Omaha, HealthSpring, Cigna, Aetna, BCBS, Wellcare, etc.), re-parse via `reparse-specific-appointments` so the corrected logic populates the real carrier into `detected_insurance_provider` / `parsed_insurance_info.insurance_provider`.
- Only touches Ally records; ~20 appointments identified above plus any others matching the pattern.

## Out of scope

- No schema changes.
- No UI changes — the display chain (`appointment.parsed_insurance_info.insurance_provider → detected_insurance_provider → lead`) is correct; only the source value is wrong.

Approve to implement.