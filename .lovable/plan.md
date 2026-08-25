# Bridge QA Operations resolution into the Review Queue QA Hold bucket

## Context: these leads are already in both systems

The 9 `qa_hold` rows are **dual-tracked by design** (per the Potential-OON safeguard):

- **QA Operations** — `evaluate-potential-oon` opens a `potential_oon` alert case for every flagged setter-submitted appointment. QA specialists audit/escalate the insurance there. All 9 already have a case.
- **Review Queue `qa_hold` bucket** — the approval gate that keeps the appointment out of the client portal until a reviewer picks "Verified in network" (releases to portal) or "Confirm OON" (marks OON). That release decision only lives here.

So showing them in the Review Queue is correct. Moving them to QA Operations only would remove the portal-release gate.

## The real problem: the two systems don't sync on resolution

Live data shows QA finished its work on several of these, but the Review Queue gate was never cleared:

| Lead | QA Ops status | QA Ops resolution | `potential_oon_resolved_at` |
|---|---|---|---|
| Jose Quinones | completed | Resolved by QA | NULL |
| Ruben Falcon | completed | Resolved by QA | NULL |
| Shamelia Burroughs | completed | Resolved by QA | NULL |
| Paris Sweezer | completed | — | NULL |
| Brenda Allen | completed | — | NULL |
| Elizabeth Spruill | completed | Escalated to ES Team | NULL |
| Charanjit Singh | pending_escalated | Escalated to Gloria | NULL |
| Deborah Washington | in_review | — | NULL |

Six are `completed` in QA Operations, yet still parked in `qa_hold` with no resolution recorded. The reviewer has no signal that QA is done — and QA's audit result never flows back to the approval gate.

## The fix

**Surface the linked QA Operations case on each QA Hold card** so the reviewer sees QA's status, resolution, and who worked it — then can act on it.

### 1. Fetch the linked `potential_oon` QA Operations case for QA Hold rows

`src/components/admin/ReviewQueue.tsx`:

- Extend the `fetch` select / a parallel lookup so each `qa_hold` row carries its linked `qa_cases` row (`alert_type = 'potential_oon'`, matched on `appointment_id`). Needed fields: `workflow_status`, `resolution_type`, `qa_name`, `date_resolved`, `escalation_status`.
- Add these to the `ReviewAppointment` interface as optional fields (e.g. `qa_case_status`, `qa_case_resolution`, `qa_case_qa_name`, `qa_case_resolved_at`).

### 2. Render a "QA Operations" status strip on QA Hold cards

In the Potential-OON panel (`isOonBlocked(row)` block, ~line 2484), add a one-line summary above the match details when a linked case exists:

- `QA Operations: <workflow_status>` — e.g. "QA Operations: Completed (Resolved by QA) by <qa_name> on <date>".
- Color cue: green when `workflow_status = 'completed'`, amber when `in_review`/`pending_escalated`.
- A short hint when QA is `completed` but the flag is still unresolved: "QA finished — verify in network or confirm OON to release."

### 3. (Optional, ask first) Auto-clear the flag when QA completes with "Resolved by QA"

When the QA Operations `potential_oon` case reaches `workflow_status = 'completed'` with `resolution_type = 'Resolved by QA'`, automatically set `all_appointments.potential_oon_resolved_at` + `potential_oon_resolution = 'in_network'` so the appointment is released to the portal without a second manual step.

This is a judgment call: it removes the manual gate (faster) but lets QA's audit auto-release a record into the client portal. If you'd rather keep the explicit reviewer sign-off, skip this and rely on step 2's surfacing.

## Technical notes

- No schema change needed — `qa_cases` already has `appointment_id`, `alert_type`, `workflow_status`, `resolution_type`, `qa_name`, `date_resolved`.
- Join can be a single PostgREST query with an inner select on `qa_cases`, or a batched second fetch keyed on the appointment IDs — whichever fits the existing fetch pattern.
- The QA Hold bucket and the Potential-OON panel already exist from the prior fix; this only adds the cross-system status display.
- Roles unchanged: QA Hold is visible to admins/agents/VAs/QA specialists/review_only, same as today.

## Open question

Step 3 (auto-clear on QA completion) changes who controls the portal release. Do you want QA's "Resolved by QA" to auto-release the record, or should the Review Queue reviewer always make the final call?
