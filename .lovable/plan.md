# Potential OON Insurance Safeguard

Flag appointments whose insurance matches a clinic-maintained exclusion list, before they reach the client-facing portal. Never auto-cancel — flag, warn, and route for human verification.

## Configuration (admin area)

New **Insurance Rules** section inside the admin area (admin + account manager access), with three tabs:

1. **Canonical plans** — a plan has one canonical name plus a list of aliases (e.g. `Blue Cross Blue Shield` ← `BCBS`, `BlueCross BlueShield`, `BC/BS`). Aliases are global and reusable across clinics.
2. **Block rules** — each rule is one row:
   - Rule type: `plan` or `group_number`
   - Value (canonical plan, or the group-number string such as `TXONEX`)
   - Match method for group numbers: `exact`, `prefix`, `contains`, `regex` (plan rules always match on the normalized canonical/alias set)
   - Scope: one or more clinics, and optionally specific locations and/or calendars within a clinic (empty = all locations/calendars of the selected clinics)
   - Active toggle, note field, created/updated by
3. **Rule tester** — paste a plan name and group number, pick a clinic/location/calendar, and see which rules would fire. Lets AMs tune a rule before enabling it, so we don't flood the queues.

Every add/edit/disable is written to the audit log.

## Matching

Runs against primary plan, secondary plan, and both group numbers (primary and secondary) from the parsed insurance data plus the raw intake notes fallback.

- Normalize before comparing: lowercase, strip punctuation/extra spaces, expand known aliases to canonical names.
- Group numbers: uppercase, strip spaces/dashes, then apply the rule's match method.
- Plan match and group match are independent — a group-number hit flags even when the plan name doesn't match.
- The evaluation records **which rule fired and what value it matched**, stored on the appointment and shown in the UI and Slack message.

Default posture is conservative: new group rules default to `exact`; `contains` and `regex` require explicitly choosing them.

## Route 1 — Self-booked (Patient Submitted)

Evaluated when the appointment is created/updated and sits in the Review Queue.

- On match: apply the `Potential OON` tag, keep the record in the Review Queue.
- The Review Queue row and detail drawer show a prominent Potential OON banner listing the matched rule(s) and the matched insurance values.
- **Approve is blocked** until the setter resolves the flag: a dialog asks them to either confirm insurance is accepted (with a required reason, which clears the flag) or mark the patient OON (existing OON workflow). Both outcomes are logged.

## Route 2 — Setter-booked (Setter Submitted)

Setter Submitted currently bypasses the Review Queue and becomes client-facing immediately. That bypass is now conditional:

- Evaluate the block list before the bypass. On match:
  - Apply the `Potential OON` tag.
  - Hold the record as **not client-facing** (review status stays pending, with a distinct `qa_hold` stage so it is not mixed into the setter Review Queue buckets).
  - Create a QA Operations case with `alert_type = 'potential_oon'`, carrying the matched rule details.
  - Send a Slack alert to a dedicated Potential OON channel, tagging the QA group.
- No match: bypass behaves exactly as today.

QA resolution in the QA Operations drawer:
- **Confirmed OON** → set status OON via the existing OON process (Slack + webhook + note), complete the audit with the documented reason.
- **Insurance accepted** → clear the Potential OON flag, approve, record becomes client-facing. Case completes with the reason.

## Slack alert

New edge function `notify-slack-potential-oon` using a new `SLACK_POTENTIAL_OON_WEBHOOK_URL` secret (you'll create the channel + incoming webhook; I'll request the secret when we build). Message includes patient name, clinic, location/calendar, appointment date/time, the matched rule and value, and a deep link to the QA Operations record.

## Technical details

- New tables: `insurance_canonical_plans`, `insurance_plan_aliases`, `insurance_block_rules`, `insurance_block_rule_scopes` (clinic/location/calendar), all with grants, RLS (admin/agent manage, authenticated read) and updated_at triggers.
- New columns on `all_appointments`: `potential_oon` (bool), `potential_oon_matches` (jsonb — rule id, type, matched value, method), `potential_oon_flagged_at`, `potential_oon_resolved_at`, `potential_oon_resolution` (`accepted` / `confirmed_oon`), `potential_oon_resolved_by`.
- Shared matcher in `supabase/functions/_shared/` so the webhook handler, the intake parser, and a backfill job all use identical logic.
- Evaluation hooks: `ghl-webhook-handler` (creation + insurance updates) and post-parse in `auto-parse-intake-notes`, so a flag can appear once insurance is parsed later.
- QA case creation reuses `qa_upsert_case` with a new `potential_oon` alert type; QA Operations gets the new alert type in filters, bucket badges, and the reports breakdown.
- `Potential OON` also pushed to the GHL contact as a tag via `update-ghl-contact-tags`, mirroring the existing tagging pattern.
- Audit logging via `log_audit_event` for: flag raised, flag resolved (with reason), and each block-rule configuration change.
- Backfill: one-time pass over recent pending/active appointments to flag existing matches, run after the rules are seeded.

## Rollout

1. Ship schema + admin config + rule tester, with evaluation running in **log-only mode** (records matches, raises no flags).
2. AMs seed rules per clinic (starting with Texas Vascular Institute) and check volume in the tester/log.
3. Enable Route 1 (Review Queue warning), then Route 2 (QA hold + Slack) once match volume looks sane.
