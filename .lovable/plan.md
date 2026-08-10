# DOB shows in GHL but is blank in the portal

## What's actually happening

For DONOTCONTACT TESTLEAD the portal row has `dob = null`, `parsed_demographics.dob = null`, and the intake notes contain no date-of-birth line at all. Two separate causes:

1. **The GHL value is 2026-08-01.** A birth date in the future is rejected on purpose by the plausibility guard we shipped (anything under 13 years old is discarded) in both `ghl-webhook-handler` and `auto-parse-intake-notes`. So the blank field is the guard working — but it's silent, so it looks like the sync is broken.
2. **`fetch-ghl-contact-data` never carries the DOB.** That function only appends GHL custom fields to the intake notes; it ignores `contact.dateOfBirth` entirely and never writes `all_appointments.dob`. So a *valid* DOB entered in GHL will also fail to reach the portal on that enrichment path.

## What to change

**A. Make the rejection visible instead of silent**
- When a DOB arrives but fails the plausibility check, record it (rejected value + timestamp + source) on the appointment row instead of dropping it.
- In the Demographics / patient card, show DOB as empty with a small amber warning: "GHL has an invalid date of birth (08/01/2026) — correct it in GHL." Admins/QA can then fix the source record rather than guessing.

**B. Fix the enrichment gap**
- `fetch-ghl-contact-data` should read `contact.dateOfBirth`, run it through the same plausibility/normalization guard, and on success write `all_appointments.dob` plus a `Date of Birth: …` line into the intake notes so the parser and Demographics card both pick it up. On failure it records the rejected value per (A).

**C. Keep the guard as-is**
No loosening of the 13-year rule — a 2026 birth date must never become client-facing.

## Technical notes

- New columns on `all_appointments`: `dob_rejected_value text`, `dob_rejected_at timestamptz` (migration, with grants unchanged from existing table).
- Shared normalization already exists in two copies (`ghl-webhook-handler/index.ts` ~line 1792 and `auto-parse-intake-notes/index.ts` ~line 2811); the fetch function will reuse the same rule set rather than adding a third variant.
- UI touch points: the Demographics section of `ParsedIntakeInfo.tsx` / patient detail view — warning badge only, no change to how a valid DOB renders.

## After it ships

The Elite test lead will still show a blank DOB — because 08/01/2026 is genuinely wrong in GHL — but it will now say why, and correcting the date in GHL will flow straight through to the portal.
