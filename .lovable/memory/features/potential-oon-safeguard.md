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

**QA Hold rules (Aug 2026):**
- For setter-submitted bookings, `ghl-webhook-handler` **awaits** `evaluate-potential-oon` BEFORE pushing the `approved` GHL tag and withholds that tag when the row is held for QA — the `approved` tag is what releases the GHL confirmation text/email, so a flagged patient is never confirmed before a reviewer approves in the Review Queue.
- QA Hold rows have **no "Back to New" action** (they are setter-booked; New is never the right destination).
- While `potential_oon` is unresolved, **Log attempt / Approve / OON are disabled**; only "Verified in network", "Confirm OON" and Decline are available.
- The Review Queue OON path pushes **both** `appointment-oon` and `oon pt` to the GHL contact (idempotent) and never touches the GHL appointment, so the client's "OON PT - Cancel Appt in future" workflow enrolls and sends the patient message.

**Service-line scoping (Aug 2026):** both `insurance_block_rule_scopes.service_line` (nullable) and `clinic_supported_insurances.service_line` (NOT NULL, `''` = all lines) scope config to one service line. Empty = applies to every service line of the clinic. Uniqueness on supported insurances is `(project_name, normalized, service_line)`; the GHL sync always writes `service_line = ''` so manual line-specific rows are never overwritten. An appointment's service line is resolved by `resolveServiceLine()` (shared matcher) / `serviceLineFromAppointment()` (`src/lib/serviceLines.ts`): `parsed_pathology_info.procedure_type|procedure`, falling back to the service parsed from the calendar name. When the line is unknown, line-specific block rules never fire and only clinic-wide accepted rows apply.
