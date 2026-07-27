## Findings (verified against the database)

Tammy Saxby, Ally Vascular and Pain Centers, has **three** non-superseded records that share the same corrupted parse:

- `ec813dea` — Jun 17 2026, No Show (latest)
- `60e70cf1` — Jun 17 2026, Cancelled
- `f1184bd9` — May 30 2026

The intake notes are complete; the parse is wrong. Confirmed corruption in all three:

- `pain_level: "7810"` — slurped from the street address (7810 Old Tupper Road)
- `duration` — contains the entire GHL "Patient Summary" one-line blob (address, DOB, insurance, appointment details) instead of "about a year"
- `symptoms: "☑️ YES"` and `numbness_cold_feet: "☑️ YES"` — checkbox markers copied instead of real symptoms
- `pcp_name: "Dr. Hameed Dosunmu (210) 593 0390"` with `pcp_phone: null` — name and phone not split
- `insurance_plan: "WELLCARE"`, group number `null` — GHL's "Insurance Plan: 80174004000" is actually the group number
- `60e70cf1` has `procedure_type: GAE` — wrong; service is Neuropathy
- `f1184bd9` is missing the insurance ID entirely

## Fix

1. Force a re-parse of all three records via `auto-parse-intake-notes` with `forceAppointmentId`.
2. Apply a targeted SQL update for anything the parser leaves wrong, using only values present in the notes:
   - Insurance: WellCare, member ID 40314616, group 80174004000
   - Medical: PCP name "Dr. Hameed Dosunmu", PCP phone "(210) 593-0390", imaging "None yet"
   - Pathology (Neuropathy): duration "about a year", symptoms "tingling, burning, numbness, swelling in hands and feet", affected areas hands and feet, treatments tried "Lyrica, ibuprofen, topical cream", imaging none, diabetic/pre-diabetic yes, symptoms interfere with walking/sleep/daily tasks, location Virtual Appointment
   - Clear the bogus `pain_level` (no pain score is recorded in the notes) and set `procedure_type: Neuropathy` on all three
3. Re-query all three records and confirm the cards populate.

## Parser hardening (root cause)

The "Patient Summary" single-line blob is the repeat offender — it is one long `Label: value; Label: value` line, so a field regex that grabs "to end of line" swallows everything after it. Memory already records this class of bug for the "Patient Intake Summary" blob; this GHL variant is labelled "Patient Summary" and isn't covered.

In `supabase/functions/auto-parse-intake-notes/index.ts`:
- Add "Patient Summary" to the blob strip/split list so it is segmented on `;` before fallback regex runs (or excluded from fallback extraction entirely).
- Reject checkbox-only values (`☑️ YES`, `YES`, `NO`) as candidates for free-text fields like `symptoms` and `numbness_cold_feet`; map them to boolean-style answers instead.
- Reject purely numeric `pain_level` candidates that don't come from a line containing "pain".

That keeps every future Ally Vascular / Neuropathy lead from arriving with the same slurped fields.
