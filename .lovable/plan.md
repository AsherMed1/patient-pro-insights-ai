# Testing the Potential OON Insurance Safeguard

## Current state (verified)

- `insurance_block_rules` is **empty** — with zero rules nothing can ever flag, so the first test step is creating a rule.
- `evaluate-potential-oon`, `notify-slack-potential-oon` are deployed; Review Queue and QA Operations both read `potential_oon` fields.
- The Slack secret `SLACK_POTENTIAL_OON_WEBHOOK_URL` still needs a value before the Slack half can be tested.

## Test plan

### 1. Create a test rule (admin UI)
In Admin → Insurance Rules:
- Add a canonical plan, e.g. "ZZ Test OON Plan", plus an alias like "zz test oon".
- Add a **Plan** rule for it, scoped to one clinic (use PPM - Test Account or Elite so no real clinic is affected).
- Add a second rule of type **Group number** with a distinctive value (e.g. `ZZTEST999`).
- Use the built-in live tester on that screen to confirm both a plan-name hit and a group-number hit match, and that a nonsense value does not.

### 2. Patient-submitted path → Review Queue block
- Create a throwaway appointment on the scoped clinic with insurance plan "zz test oon" and Insurance Intake Source unset/Patient Submitted.
- Expect: row lands in Review Queue **pending**, carries the potential-OON flag/badge, and Approve is blocked with the reason shown.
- Confirm the row is invisible in the client portal for that clinic.

### 3. Setter-submitted path → QA hold + Slack
- Same insurance values, but with Insurance Intake Source = "Setter Submitted" (which normally auto-approves).
- Expect: instead of going client-facing, the row moves to `qa_hold` and appears in QA Operations with the OON reason.
- Slack alert fires only once the webhook secret is set.

### 4. Negative control
- One more throwaway appointment with an unmatched plan (e.g. "Aetna PPO") on the same clinic — must flow through normally with no flag, proving the rules aren't over-matching.

### 5. Scope check
- Repeat step 2 on a **different** clinic not covered by the rule scope — must not flag, proving clinic scoping works.

### 6. Cleanup
- Delete the throwaway appointments and deactivate/remove the ZZ test rules, plan, and alias.

## What I need from you

- The Slack webhook URL for the channel that should receive potential-OON alerts (I'll store it as `SLACK_POTENTIAL_OON_WEBHOOK_URL`). Steps 1–5 can run without it; only the Slack notification stays untested.
- Confirmation of which clinic to use for the throwaway records (default: PPM - Test Account).

I can drive steps 1–6 myself with throwaway data and report results, or leave the UI walkthrough to you — say which you prefer.
