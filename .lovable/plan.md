# Elite Minimally Invasive Specialists: verify credentials and backfill the records

Confirmed in the database: the project row now has location ID `7LaQyWqs57pIztlSpfZo` and a stored API key. The two existing appointments for this clinic are still holding the stub data they arrived with, so they need to be re-pulled.

Current state of the clinic's records:

- **DONOTCONTACT TESTLEAD** (created Aug 10, appointment Aug 27) — 241 characters of intake notes, DOB stored as `2026-08-01`, no age.
- **Mohsin Test** (created Aug 6, appointment Aug 10) — no intake notes at all, no DOB.

## Steps

1. **Verify the key actually works.** Call the GHL contact fetch for one of the two records. If it returns 401/403, the token is wrong or lacks scopes and everything below stops here — I'll tell you exactly which error came back.
2. **Re-enrich both records.** Pull the full GHL contact and custom fields into the intake notes, then re-run intake parsing so Demographics, Insurance, PCP/Medical and Pathology fill in.
3. **Clear the bogus DOB.** Null out `2026-08-01` on the test lead (top-level column and the parsed demographics object) before re-parsing, so the new guard doesn't inherit it, and let the real DOB come from GHL if present.
4. **Confirm the result.** Re-read both rows and report which fields populated and which are genuinely absent in GHL.

## Technical details

- Invoke `fetch-ghl-contact-data` per appointment ID, then `auto-parse-intake-notes` for the clinic's rows.
- DOB clear: `update all_appointments set dob = null, parsed_demographics = parsed_demographics - 'dob' - 'age'` for `9dac5782`.
- No code changes expected — the location-backfill, credential badge and DOB plausibility guard already shipped. If the enrichment call surfaces a new failure mode, I'll come back with a follow-up plan rather than patching silently.

Note: both records are test leads. If you have a real Elite patient you want validated instead, name them and I'll target that one.
