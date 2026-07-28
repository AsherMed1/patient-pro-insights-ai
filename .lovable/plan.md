
## Goal

Produce reference documentation for the OON and Do Not Call (DNC) workflows so the patient journey can be accurately mapped. There's no existing flowchart in the repo — the behavior lives across memory rules, three edge functions, and a handful of DB triggers. This plan captures both surfaces in one place.

## Deliverables

1. `docs/oon-dnc-workflow.md` — written walkthrough
2. `docs/oon-dnc-workflow.mmd` — mermaid flowchart artifact (rendered inline in chat)

No code changes. Documentation only.

## Written doc structure (`docs/oon-dnc-workflow.md`)

- **Overview** — OON and DNC are *portal-only terminal statuses*. Every write must fire the full side-effect chain or be rejected. No silent transitions.
- **Entry points** (who can set the status)
  - Portal UI (`AllAppointmentsManager.handleStatusChange`) — primary path
  - Review Queue → "Mark OON" (sets `review_status='oon'`, admin-only visibility)
  - GHL webhook (`ghl-webhook-handler`) — when GHL drives the change, the handler fires the same side-effects
  - External REST (`update-appointment-status`), `sync-from-sheet`, `sync-buffalo-appointment-statuses` — **rejected/skipped** for OON/DNC
- **Side-effect chain per status**
  - **OON**: `notify-slack-oon` (🚨 ACTION REQUIRED Slack alert, 5-min follow-up) → `appointment-status-webhook` (client's GHL OON workflow) → appointment_notes status-change note with user attribution → `handle_appointment_status_completion` trigger sets `internal_process_complete=true` → `qa_ingest_terminal_status` creates a QA case (`alert_type='oon'`) → row routes to Completed tab, hidden from New/Needs Review
  - **DNC**: `appointment-status-webhook` (client's GHL DND workflow) → GHL DND enable + `do-not-reschedule` tag → status-change note ("Re-triggered Do Not Call workflow by {user}") → same IPC/QA/routing as OON; **no Slack alert** (DNC only fires OON Slack when OON)
- **GHL-driven path** (`ghl-webhook-handler` lines ~580–616) — when a GHL webhook flips status to OON/DNC the handler dispatches the same Slack (OON only) + `appointment-status-webhook` calls so the workflow is identical regardless of origin
- **Protections**
  - Portal-only guard in `update-appointment-status` returns 403 for OON/DNC
  - GHL webhook guard blocks external overwrite of existing OON/DNC/Cancelled rows (120s echo-back debounce)
  - Re-selecting OON/DNC in the portal re-fires Slack + webhook (only way to retrigger the client's GHL workflow)
- **QA Operations Queue behavior** — OON creates a `qa_cases` row (`alert_type='oon'`), routed to the OON tab; Review-Queue → OON transitions flip an existing `review_queue` case to `oon`
- **Downstream statuses** — OON/DNC are terminal. Rows stay in Completed. Reschedule blocked unless admin overrides (`patient_reschedule_blocks`, `no-show-not-eligible` GHL tag applied for DNC-style permanent blocks). Recapture linking is not triggered from OON/DNC.
- **Manual vs automatic**
  - Manual: user selects status in portal (dropdown), user confirms cancellation reason (DNC path)
  - Automatic: Slack alert, GHL workflow webhook, status-change note, IPC completion trigger, QA case creation, review-queue snapshot freeze
- **Cross-references** — file paths + line ranges for each function/trigger so a reader can jump into code

## Mermaid diagram (`docs/oon-dnc-workflow.mmd`)

Flowchart shape:

```text
[User in Portal] --set OON--> [handleStatusChange]
                              |
                              +--> notify-slack-oon (🚨 ACTION REQUIRED)
                              +--> appointment-status-webhook -> GHL OON workflow
                              +--> appointment_notes (status change, "by {user}")
                              +--> all_appointments.status='OON'
                                     |
                                     +--> handle_appointment_status_completion (IPC=true)
                                     +--> qa_ingest_terminal_status -> qa_cases (alert_type='oon')
                                     +--> Routes to Completed tab

[User in Portal] --set Do Not Call--> [handleStatusChange]
                                       |
                                       +--> appointment-status-webhook -> GHL DND workflow
                                       +--> GHL DND enable + do-not-reschedule tag
                                       +--> appointment_notes (status change)
                                       +--> Same IPC/QA/routing as OON (no Slack)

[GHL webhook] --status=OON/DNC--> [ghl-webhook-handler]
                                    +--> Same side-effect chain as portal
                                    (guard: rejects overwriting existing OON/DNC)

[External REST / Sheets / Buffalo sync] --OON/DNC--> [REJECTED 403 / SKIPPED]
```

Rendered with mermaid `flowchart LR`, using subgraphs for "Entry points", "Automatic side-effects", "Terminal state / QA", and a dashed "Protections" branch.

## Technical notes

- Source of truth for behavior is the `OON/DNC Portal-Only` core memory rule plus:
  - `src/components/AllAppointmentsManager.tsx` lines ~771–880 (portal handler)
  - `supabase/functions/notify-slack-oon/index.ts`
  - `supabase/functions/appointment-status-webhook/index.ts`
  - `supabase/functions/ghl-webhook-handler/index.ts` lines ~580–616, ~1461+
  - `supabase/functions/update-appointment-status/index.ts` lines ~138–152 (403 guard)
  - DB triggers: `handle_appointment_status_completion`, `qa_ingest_terminal_status`, `qa_ingest_review_queue`
- Diagram file uses `.mmd` and is emitted as a `lov-artifact` in the chat reply so you can preview it immediately; the markdown file lives under `docs/` for long-term reference.
