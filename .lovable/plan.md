# QA Hold inside QA Operations

Move the Potential OON verification work out of the Review Queue and into QA Operations, so a specialist can verify, audit, escalate, ticket and complete a record in one place — and a completed record never bounces back to New.

## What exists today

- `evaluate-potential-oon` flags an appointment (`potential_oon`, matches, `review_stage='qa_hold'`) and, for setter-booked records, already opens a QA case with alert type **Potential OON**.
- The verify actions (**Verified in network** / **Confirm OON**) only exist in the Review Queue's QA Hold tab.
- Confirming OON sets the appointment status to OON, which fires the QA ingestion trigger and re-opens (or creates) an **OON** case in **New** — this is the back-and-forth the team is hitting.

## Changes

### 1. QA Hold bucket in QA Operations
- New **QA Hold** toggle next to the existing status tabs, showing every case whose appointment still carries an unresolved Potential OON flag (`potential_oon = true` and no `potential_oon_resolved_at`), regardless of workflow status.
- Badge count on the tab, kept live through the existing realtime subscription.
- Rows show the matched plan / group / ID reason inline, same wording as the Review Queue panel.

### 2. Potential OON panel in the case drawer
A highlighted panel at the top of the drawer for held records, with the match details and two actions:

- **Verified in network** — clears the flag, writes an internal note, approves the appointment in the Review Queue sense (same approve path and GHL `approved` tag, so the confirmation message goes out), and lets the specialist finish the audit and press Complete. Approval side effects are unchanged.
- **Confirm OON** — clears the flag as out of network, marks the appointment OON using the existing OON path (status OON, `appointment-oon` + `oon pt` tags pushed so the GHL workflow owns the cancellation and patient message, Slack/webhook side effects unchanged), and **leaves the case open** in its current workflow status. No auto-complete.

After either action the record stays in the drawer: audit fields, internal notes, escalation and Create ticket all remain usable. The case only leaves the queue when the specialist presses **Complete**.

### 3. No return to New
The QA ingestion trigger for OON status changes will skip creating or reopening a separate OON case when the same appointment already has a Potential OON case that the specialist is working (or has just completed). Instead it records the OON outcome as an activity entry on that case. Result: confirming OON never resurrects a completed record into New, and never spawns a duplicate row.

### 4. Activity history
Every step is logged to the case activity trail with actor name and timestamp: opened, verification outcome (in network / OON), audit field changes, notes, escalations, ticket creation, and completion. Appointment-side internal notes continue to be written as they are today.

## Technical details

- `src/components/admin/QAOperationsQueue.tsx`
  - fetch `potential_oon`, `potential_oon_matches`, `potential_oon_resolved_at`, `review_stage` alongside the existing appointment enrichment query
  - new `qaHold` bucket in the tab strip + count, filter applied before the existing group/sort pipeline
  - new `PotentialOonPanel` block in the drawer with the two actions
- Shared action helpers extracted from `ReviewQueue.tsx` (resolve flag, approve with GHL `approved` tag, OON with `appointment-oon` + `oon pt` tags, review history + audit log rows) into `src/lib/reviewActions.ts` so both surfaces run identical logic — Review Queue behaviour is unchanged.
- Migration: update `qa_ingest_terminal_status` so the OON branch is a no-op (activity row only) when an active or recently completed `potential_oon` case exists for the appointment.
- No new tables or columns.
