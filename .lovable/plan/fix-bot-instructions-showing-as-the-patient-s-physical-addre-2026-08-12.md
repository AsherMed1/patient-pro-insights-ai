# Fix: bot instructions showing as the patient's physical address

## What is happening

The Appointment Overview address line is not always the patient's stored address. When a record has no saved address, the portal falls back to *guessing* an address out of the raw intake notes with a set of loose text patterns (`extractAddressFromNotes` in `DetailedAppointmentView.tsx`).

Two flaws in that guesser produce the "AI Bot" text:

1. The street-suffix list (`St`, `Dr`, `Ct`, `Ln`, `Way`, ...) is matched case-insensitively with no word boundaries, so ordinary words match: "conta**ct**", "**St**atus", "hun**dr**ed". A sentence such as "6 months, kindly disqualify them ... If the conta**ct**" therefore looks like "number + street + suffix" and qualifies as an address.
2. Of all matches it keeps the **longest** one — which is exactly the long bot-prompt paragraph rather than a real street line.

The bot text itself arrives legitimately: GoHighLevel stores the booking bot's system prompt in a contact custom field ("OpenAI Prompt: Role: You are ... Disqualification Criteria: ..."), and the webhook writes every custom field into the intake notes. The parser already strips that block before AI parsing, but the portal's display-time fallback reads the *unstripped* notes.

Confirmed in the data: the GHL notes for Nashville Vascular records contain the full "OpenAI Prompt:" bot block, and no record currently stores bot text in the saved address field — which matches the symptom being a display-time fallback, not a stored value.

## The fix

1. **Harden the address guesser** (`extractAddressFromNotes`):
   - Strip the bot block (`OpenAI Prompt: ...` to end) and the single-line "Patient Intake Summary/Patient Summary" blob before scanning, mirroring what the parser already does.
   - Require word boundaries and proper casing on street suffixes so "contact"/"status" no longer match.
   - Require the candidate to look like a real address: starts with a house number, ends with a city/state/ZIP or a genuine suffix, capped at ~120 characters, no sentence punctuation, and rejected if it contains bot-prompt giveaways (disqualify, emoji, booking, appointment within, "Role:", etc.).
   - Prefer the labeled `Address:` line from the "=== GHL Contact Data ===" contact section when present, instead of free-text scanning.
   - Choose the best-scoring candidate rather than simply the longest.
2. **Prefer real data over guesses**: use the stored `parsed_contact_info.address` first (already the case), then the labeled GHL contact line, and only then the pattern scan. If nothing passes validation, show nothing rather than a wrong value.
3. **Data check**: scan existing records for saved addresses that contain bot-prompt wording or are unreasonably long, and clear those so they fall back to the corrected logic. Jamesena L Johnson and Stella D Irving already have correct saved addresses and are unaffected.

## Technical notes

- File changed: `src/components/appointments/DetailedAppointmentView.tsx` (address extraction + `getPatientAddress`).
- Shared guard wording reused from `supabase/functions/auto-parse-intake-notes/index.ts` (`stripPatientIntakeSummary`) so display and parsing agree on what is bot noise.
- No webhook or parser behavior changes; intake notes keep the full GHL payload for audit.
