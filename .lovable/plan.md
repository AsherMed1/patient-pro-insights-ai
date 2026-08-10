# Testing the Potential OON Safeguard

## Where things stand right now

- 50 clinics have had their GHL insurance dropdown synced — 876 accepted-insurance options are stored.
- 0 canonical plans and 0 block rules exist, and no clinic is in Allowlist mode. So today nothing can be flagged.
- No appointment has ever been flagged yet.
- Slack: a dedicated `SLACK_POTENTIAL_OON_WEBHOOK_URL` is not set, but the function falls back to the existing `SLACK_OON_WEBHOOK_URL`, so Slack alerts will land in the current OON channel unless you want a separate one.

## What I'll do

I'll run a full end-to-end test myself against the test clinic (**PPM - Test Account**) using throwaway records, then clean up. Two paths get tested because they behave differently:

1. **Denylist path (block rules)** — create a canonical plan "ZZ Test Health" plus a block rule and a group-number rule scoped to the test clinic.
2. **Allowlist path (GHL-synced accepted insurances)** — sync the test clinic's insurance dropdown from GHL, switch it to Allowlist mode, and confirm an insurance that is *not* on the list gets flagged while one that *is* on the list passes.

For each path I'll create two throwaway appointments:

- **Patient-submitted** → expect: flagged, stays in Review Queue, Approve is blocked until a reviewer resolves the flag with a reason.
- **Setter-submitted** (normally auto-approved) → expect: pulled back to QA hold, a QA Operations case opens with a "Potential OON" alert, Slack fires.

I'll also verify the negatives: a clinic in Denylist mode is unaffected by the allowlist, generic answers ("Other", "Self pay/ Cash", blank) never flag, and rules scoped to one clinic don't leak to another.

## What you'll do (5 minutes, in the portal)

1. **Admin → Insurance Rules → Canonical plans** — confirm "ZZ Test Health" and its aliases are there.
2. **Block rules tab** — see the test rule and its clinic scope.
3. **Rule tester tab** — type a plan name and group number, pick the test clinic, and watch it report a match live. This is the fastest way for you to sanity-check any real rule before it goes live.
4. **Supported insurances tab** — pick a clinic, hit "Sync from GHL", flip the mode dropdown to Allowlist, and see the accepted list.
5. **Review Queue** — open the flagged test patient, see the amber Potential OON banner and match reasons, try Approve (blocked), then resolve the flag with a reason and approve.
6. **QA Operations** — filter alerts to "Potential OON" and confirm the setter-submitted test case is sitting there.

## After the test

I'll delete every throwaway appointment, QA case, rule, and canonical plan created for the test, and leave the test clinic back in Denylist mode. Then we decide the rollout: which clinics go Allowlist first (a pilot of 1-2 is safest), and whether you want a dedicated Slack channel for potential-OON alerts.

## Technical notes

- Evaluation entry point is the `evaluate-potential-oon` edge function, which accepts `appointment_id` or `appointment_ids`; it's also called automatically from `ghl-webhook-handler` and `auto-parse-intake-notes`.
- Flag state lives on `all_appointments`: `potential_oon`, `potential_oon_matches`, `potential_oon_flagged_at`, and the resolution columns.
- Allowlist checks only run when `projects.oon_mode = 'allowlist'` for that clinic; otherwise only block rules apply.
- Test data will be tagged so cleanup is exact — no production rows are touched.

## Open question

Do you want potential-OON Slack alerts in the existing OON channel (works today with no setup), or a separate channel? For a separate channel I'll need a new Slack webhook URL from you.
