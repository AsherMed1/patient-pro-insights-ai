---
name: Potential OON Insurance Safeguard
description: Rule-based flagging of likely out-of-network insurance before appointments become client-facing; Review Queue block vs QA hold routing.
type: feature
---
Config lives in Admin → Insurance Rules (`src/components/admin/InsuranceRulesConfig.tsx`):
- **Canonical plans** with aliases (`insurance_canonical_plans`, `insurance_plan_aliases`).
- **Block rules** (`insurance_block_rules`): `rule_type` plan|group, `match_method` exact|prefix|contains|regex, optional clinic/location scoping via `insurance_block_rule_scopes` (no scope rows = all clinics).
- **Rule tester** uses the browser copy of the matcher (`src/lib/oonMatching.ts`), which must stay in sync with `supabase/functions/_shared/oon-matcher.ts`.

Normalization: plans lowercased with punctuation → spaces; group numbers lowercased and stripped to alphanumerics.

Evaluation entry point is the `evaluate-potential-oon` edge function, invoked fire-and-forget from `ghl-webhook-handler` (after insert/update) and from `auto-parse-intake-notes` (after a successful parse).

Routing:
- **Patient submitted (pending)** — row is flagged (`potential_oon`, `potential_oon_matches`); the Review Queue shows a Potential OON badge + banner and blocks Approve until a reviewer picks "Verified in network" (clears the flag) or "Confirm OON" (marks the appointment OON).
- **Setter submitted (already approved)** — row is pulled back to `review_status='pending'`, `review_stage='qa_hold'`, a `potential_oon` QA Operations case is opened via `qa_upsert_case`, and Slack is alerted through `notify-slack-potential-oon` (`SLACK_POTENTIAL_OON_WEBHOOK_URL`, falls back to `SLACK_OON_WEBHOOK_URL`).

Once `potential_oon_resolved_at` is set, re-evaluation never re-flags the same row.
