# Test the Potential OON Safeguard

Current state (verified just now): the tables exist but are empty — 0 canonical plans, 0 aliases, 0 block rules, 0 scopes, and 0 appointments flagged. Nothing can fire until at least one rule is seeded, so the first test step is seeding.

## What I'll test (throwaway data only, no real patients touched)

1. **Rule Tester (no data written)** — In Insurance Rules, create a canonical plan `Test OON Plan` with alias `TOP`, and one group rule `ZZTEST` (exact), scoped to `PPM - Test Account`. Use the Rule Tester tab to confirm both a plan hit and a group hit register, and that a non-matching value does not.
2. **Patient-submitted route** — Create a throwaway appointment on `PPM - Test Account` with insurance plan `TOP` and pending review status, run `evaluate-potential-oon` against it, then confirm:
   - `potential_oon = true` with the matched rule stored in `potential_oon_matches`
   - Review Queue row shows the Potential OON badge/banner
   - Approve is blocked until resolved; resolving as "insurance accepted" clears the flag and lets approval through
3. **Setter-submitted route** — Second throwaway record already `review_status = 'approved'`, run the evaluator, then confirm:
   - it is pulled back to `review_status = 'pending'`, `review_stage = 'qa_hold'` (no longer client-facing)
   - a QA Operations case is created with alert type `potential_oon` and is visible/filterable in the queue
   - an audit note is written on the appointment
4. **Slack alert** — Check the `notify-slack-potential-oon` logs for a 200. Without `SLACK_POTENTIAL_OON_WEBHOOK_URL` it falls back to the existing OON webhook, so the test message would land in the current OON channel. Tell me if you'd rather I skip the Slack step until you create a dedicated channel.
5. **Cleanup** — Delete the two throwaway appointments, the QA cases, and the test rule/plan/alias so nothing lingers.

## What you should do after I test

Seed the real rules per clinic (starting with Texas Vascular Institute): add the canonical plan names plus the aliases the intake notes actually use, and any group-number rules. Use the Rule Tester on a few real-looking values before switching a rule to Active so we don't flood the Review Queue.

## Draft reply for the ticket

> The insurance safeguard is built and in the portal. Appointments are now checked against a configurable block list of plan names and group numbers before they become client-facing:
>
> - Self-booked (patient-submitted) matches get a "Potential OON" flag in the Review Queue, and approval is blocked until the setter either confirms the insurance is accepted or marks the patient OON.
> - Setter-booked matches are held back from the client portal, open a QA Operations case, and trigger a Slack alert to the QA team.
>
> Nothing is ever auto-cancelled — every match routes to a human. Admins manage the plan list, aliases, and rules under the new "Insurance Rules" tab, which also has a tester to preview what a rule would catch before enabling it.
>
> Next step on our side: seeding the actual out-of-network plans/group numbers per clinic, starting with Texas Vascular Institute. Please send the list of plans and group numbers you want flagged.

## Technical details

- Evaluator: `supabase/functions/evaluate-potential-oon`, matching logic shared via `supabase/functions/_shared/oon-matcher.ts` and mirrored for the browser tester in `src/lib/oonMatching.ts`.
- Hooks: `ghl-webhook-handler` (create/insurance update) and `auto-parse-intake-notes` (post-parse) both call the evaluator.
- Verification will use direct DB reads on `all_appointments` (`potential_oon*` columns), `qa_cases`, and `appointment_notes`, plus edge function logs.
