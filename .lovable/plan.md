# Missing demographics / insurance — Vivid Vascular, Ozark, LJV

## What the records actually show

All three records were inspected directly in the database.

**Rafael Paulino (Vivid Vascular)** — The intake notes on this appointment are only 130 characters and contain just address plus `insurance_provider: OSCAR`. There is no `=== GHL Contact Data (Full) ===` block, which every normally-synced appointment has. The insurance ID is present now, but only because a portal user typed it in manually at 17:11 today (there is an internal note recording the manual edit). So the ID never arrived from GHL on its own.

Cause: the appointment came in from an AI call with a thin payload, and the insurance ID was filled into the GHL contact **after** booking. The webhook handler only pulls contact custom fields (insurance provider / ID / card) when an **appointment** event fires. A contact-only update is routed to a notes-only branch that writes `parsed_medical_info.notes` and nothing else — insurance and demographics are never refreshed. Any patient whose insurance is captured post-booking has the same gap.

**Kevin Eifert (Ozark, PAD)** — The notes DO contain the full GHL block with address, city, state, zip, phone, email and DOB, but `parsed_contact_info` holds only `{name: "Kevin Eifert"}`. DOB and age did land in `parsed_demographics`, and `parsed_medical_info` is empty. So the data arrived and the parser dropped it: the contact card renders blank even though the source text has everything.

**Esther De La Cruz (LJV, GAE)** — Contact and insurance fields are populated, but `parsed_demographics.age` is the string `"46 to 55"` (an age *range* copied from the pathology answers) instead of a number derived from her DOB of 1967-08-16. Her real age is 58. Medical/pathology data is present.

Her clinic's own portal note (03 Aug) says her status is OON and they are "unable to update the status." The exact reason for that is **not yet confirmed** — the project has 5 assigned users, the row-level update policy for project users covers Liberty Joint & Vascular, and there is no client-side lock on the OON status. Verifying it is the first step below, not an assumption.

## Plan

**1. Confirm the LJV edit blocker (first, before any code change)**
Reproduce a status/field update on Esther's record as a project user and read the actual Postgres response — checking for an expired-session downgrade (the portal already detects this), a policy denial, or a trigger raising an error on transition out of OON. Fix whatever the reproduction names. If it turns out to be an expired session, add clearer wording rather than a schema change.

**2. Restore the three records**
- Rafael: keep the manually entered insurance, and re-pull his GHL contact so the full contact block, demographics and card link are present rather than the 130-character stub.
- Kevin: rebuild `parsed_contact_info` (address, city, state, zip, phone, email, DOB) from the GHL block already stored in his notes.
- Esther: recompute `parsed_demographics.age` from her DOB (58) and stop the pathology age range from occupying that field.

**3. Fix the contact-parse gap (Kevin's class of problem)**
In the intake parser, add a deterministic fallback that reads the `=== GHL Contact Data (Full) ===` block and fills any contact/demographic field the AI left empty. Today an incomplete AI response is accepted as-is, so populated source text still renders as an empty card.

**4. Fix age vs. age range**
Age is derived from DOB whenever a DOB exists; a range answer such as "46 to 55" stays in the pathology section and never overwrites the demographics age.

**5. Fix the post-booking insurance gap (Rafael's class of problem)**
Extend contact-level GHL sync so it refreshes insurance provider / plan / ID / card URL and demographics on the matching active appointment, using the same non-null merge the appointment path already uses — never blanking a value that is already there, and respecting terminal-status and superseded guards.

**6. Sweep the three clinics**
Scan recent appointments for Vivid Vascular, Ozark and Liberty Joint & Vascular for the same three signatures — thin notes with no GHL block, a full GHL block with an empty contact object, and a non-numeric age — then backfill what the source text supports and report the counts.

## Technical notes

- Touched: `supabase/functions/ghl-webhook-handler/index.ts` (contact-level enrichment beyond notes-only), `supabase/functions/auto-parse-intake-notes/index.ts` (deterministic contact/demographic fallback, age derivation).
- Restoration and the sweep are data updates against `all_appointments`, merging into the `parsed_*` JSONB objects and their matching top-level columns together, per the existing data-integrity rule.
- No schema change is expected unless step 1 surfaces a policy or trigger defect.
