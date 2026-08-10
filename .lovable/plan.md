# Insurance Rules: in-app explainers + expanded guide

Add plain-English help to the Insurance Rules screen so admins understand what each tab does, and give you the expanded instruction text to send out.

## In-app changes (Admin → Insurance Rules)

Add a short explainer block at the top of each of the four tabs, plus one line under the card title explaining the two modes (Block rules vs Allowlist).

- **Canonical plans** — "The master list of insurance names. Each plan holds its spelling variants (aliases), so 'Ambetter', 'Ambetter Superior' and 'ambetter-tx' are all recognised as the same plan. Add a plan here first, then use it in a block rule or link it to a synced GHL option."
- **Block rules** — "Denylist. A rule flags an appointment when the patient's insurance plan (or group number) matches. Rule type = plan or group number; Match method = exact / starts with / contains / regex; Clinic scope and Location limit the rule to one clinic or site — leave blank to apply everywhere. The Note explains why it is OON and is shown on the flag."
- **Supported insurances** — "Allowlist. Options are pre-filled from the 'Please select your insurance provider' dropdown in each clinic's GHL sub-account — press Sync from GHL (or Sync all clinics) to pull them in; re-sync after the clinic edits the dropdown. Generic answers (Other, Not sure, Self pay) are auto-marked Generic and never count as accepted. You can also add options manually and link each one to a canonical plan. Switch OON mode to Allowlist to flag anything not on this list."
- **Rule tester** — "Dry run. Enter a clinic, location, plan name and group number to see whether it would be flagged and by which rule, without touching any real appointment. Use it after adding a rule to confirm it catches what you expect and nothing else."

Also add a one-line mode hint next to the OON mode selector: "Block rules only = flag only what matches a rule. Allowlist = flag anything not on the clinic's accepted list."

## Expanded written guide

I'll post the full team-facing text in chat, extending your draft with a proper Step 1 that covers: where the data comes from (GHL sync), what canonical plans / aliases are for, how block rules and match methods work, clinic scoping, choosing denylist vs allowlist, and testing before going live.

## Technical notes

- Single file touched: `src/components/admin/InsuranceRulesConfig.tsx` — copy-only additions (muted helper text inside each `TabsContent`, plus the card description). No logic, schema, or matcher changes.
