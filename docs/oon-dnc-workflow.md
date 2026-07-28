# OON & Do Not Call (DNC) Workflow

**Status:** Reference documentation
**Scope:** How the PatientPro Portal handles the two *portal-only terminal* statuses — Out of Network (OON) and Do Not Call (DNC).

There is no other flowchart for this workflow — this doc and the companion `oon-dnc-workflow.mmd` diagram are the source of truth for the patient journey after either status is set.

---

## 1. Core rule

OON and DNC are **portal-only terminal states.** Any code path that writes `status = 'OON'` or `'Do Not Call'` to `all_appointments` MUST fire the full side-effect chain or reject the write. **No silent transitions.**

The side-effect chain is:

| Side-effect | OON | DNC |
|---|---|---|
| `notify-slack-oon` (Slack alert) | ✅ | ❌ |
| `appointment-status-webhook` (client's GHL workflow) | ✅ | ✅ |
| GHL DND enable + `do-not-reschedule` tag | ❌ | ✅ |
| `appointment_notes` status-change note ("by {user}") | ✅ | ✅ |
| `handle_appointment_status_completion` trigger → `internal_process_complete = true` | ✅ | ✅ |
| `qa_ingest_terminal_status` trigger → `qa_cases` row | ✅ | ✅ |
| Route to **Completed** tab, hidden from New / Needs Review | ✅ | ✅ |

---

## 2. Entry points (who can set the status)

### 2.1 Portal UI — primary path
`src/components/AllAppointmentsManager.tsx` → `handleStatusChange` (lines ~771–880).
User selects OON or Do Not Call from the status dropdown on an appointment card. Re-selecting the same terminal status intentionally **re-fires** the Slack alert + `appointment-status-webhook` — this is the only supported way to retrigger the client's GHL workflow.

### 2.2 Review Queue → "Mark OON"
`src/components/admin/ReviewQueue.tsx`. Sets `review_status = 'oon'` on the row. The appointment stays **admin-only** (visible only in Review Queue → OON tab, hidden from every client portal view). Fires the same Slack + webhook + note chain.

### 2.3 GHL webhook (inbound)
`supabase/functions/ghl-webhook-handler/index.ts` lines ~580–616.
When GHL itself flips a status to OON or DNC, the handler dispatches the identical side-effect chain (Slack for OON, webhook for both, status-change note) so the workflow is provider-agnostic.

### 2.4 Rejected / skipped writers
The following surfaces are **not permitted** to set OON/DNC and will reject or skip:

- `supabase/functions/update-appointment-status/index.ts` lines ~138–152 → returns HTTP **403** with `"Forbidden status"`.
- `supabase/functions/sync-from-sheet/*` → skips OON/DNC rows.
- `supabase/functions/sync-buffalo-appointment-statuses/index.ts` → skips OON/DNC.

This prevents external integrations from bypassing the Slack + GHL workflow chain.

---

## 3. Side-effect chain — detailed

### 3.1 OON (Out of Network)

1. **Portal** — user selects **Out of Network** on the appointment card. `handleStatusChange('OON')` runs.
2. **Slack alert** — `notify-slack-oon` posts a 🚨 *ACTION REQUIRED* message to the OON Slack channel with patient name, phone, calendar, project, appointment ID, and a "Follow up within 5 minutes" callout (`supabase/functions/notify-slack-oon/index.ts`).
3. **Client's GHL workflow** — `appointment-status-webhook` is invoked with the new status; the client-side GHL workflow subscribed to this webhook typically cancels the calendar event and sends the patient the OON message.
4. **Audit note** — an `appointment_notes` row is written: `"Status changed to OON by {userName}"`. Re-triggers add `"Re-triggered OON workflow by {userName}"`.
5. **`all_appointments.status = 'OON'`** is persisted.
6. **DB triggers**:
   - `handle_appointment_status_completion` → sets `internal_process_complete = true`.
   - `qa_ingest_terminal_status` → upserts a `qa_cases` row with `alert_type = 'oon'`, routed to the QA Operations Queue OON tab.
7. **Routing** — row moves to the **Completed** tab; it is excluded from New, Needs Review, Upcoming, and all client-portal views (except Review Queue → OON for admins).

### 3.2 Do Not Call (DNC)

1. **Portal** — user selects **Do Not Call**. `handleStatusChange('Do Not Call')` runs. Same-status re-selection re-fires the workflow.
2. **GHL DND + tag** — the portal enables DND on the GHL contact and adds the `do-not-reschedule` tag. GHL workflows filter on tags more reliably than DND alone.
3. **Client's GHL workflow** — `appointment-status-webhook` is invoked (client's DND workflow, if configured).
4. **Audit note** — `"Status changed to Do Not Call by {userName}"` (or re-trigger variant).
5. **`all_appointments.status = 'Do Not Call'`** is persisted.
6. **DB triggers** — same IPC + QA case (`alert_type = 'do_not_call'`) as OON.
7. **Routing** — same as OON. Row is terminal.
8. **No Slack alert.** Slack OON notification is intentionally OON-only.

### 3.3 GHL-driven path
If a GHL webhook flips status to OON or DNC:

- `ghl-webhook-handler` detects the transition, applies the portal-side guards (see §4), then invokes `notify-slack-oon` (OON only) + `appointment-status-webhook` inline so the downstream behavior is identical.
- A status-change note attributed to *"GHL webhook"* is written to `appointment_notes`.

---

## 4. Protections

- **External REST guard** — `update-appointment-status` returns 403 for OON/DNC (`supabase/functions/update-appointment-status/index.ts` lines ~138–152).
- **Overwrite guard** — `ghl-webhook-handler` (line ~1461+) refuses to overwrite an existing OON, DNC, or Cancelled row from a GHL webhook. Prevents accidental status regression.
- **Echo-back debounce** — 120s window guards against a GHL webhook echoing back the same status we just wrote.
- **Review-Queue snapshot freeze** — declined/dismissed rows are frozen; a subsequent GHL edit for the same `ghl_appointment_id` creates a fresh pending row rather than mutating the OON/DNC snapshot.

---

## 5. QA Operations Queue behavior

- OON → new `qa_cases` row with `alert_type = 'oon'`. Appears in the OON tab of QA Operations.
- DNC → `qa_cases` row with `alert_type = 'do_not_call'`.
- Review Queue → OON transitions **flip** an existing `review_queue` case to `oon` rather than creating a duplicate.
- Reviewer name (`profiles.full_name`) is captured in `qa_case_activity`.

---

## 6. Downstream statuses

OON and DNC are **terminal**. There are no automatic transitions out of them.

- **Reschedule** — blocked. Admin can override via `patient_reschedule_blocks`. For DNC-style permanent blocks the `no-show-not-eligible` GHL tag is applied.
- **Recapture** — the recapture linker skips OON/DNC (they are not "lost appointments" in the recapture sense).
- **EMR queue** — `auto_resolve_emr_queue_on_terminal_status` moves any pending EMR item to `completed`.

---

## 7. Manual vs automatic

| Step | Manual | Automatic |
|---|---|---|
| Select OON/DNC in portal dropdown | ✅ | — |
| Confirm cancellation reason (DNC path) | ✅ | — |
| Slack alert (OON) | — | ✅ |
| `appointment-status-webhook` → GHL workflow | — | ✅ |
| GHL DND + tag (DNC) | — | ✅ |
| Status-change note | — | ✅ (attributed to user) |
| IPC = true (via trigger) | — | ✅ |
| QA case creation | — | ✅ |
| Review-Queue snapshot freeze | — | ✅ |
| Reschedule override | ✅ (admin only) | — |

---

## 8. File & function cross-reference

| Concern | Path | Notes |
|---|---|---|
| Portal handler | `src/components/AllAppointmentsManager.tsx` | lines ~771–880 (`handleStatusChange`, DNC + OON branches) |
| Review Queue → OON | `src/components/admin/ReviewQueue.tsx` | admin-only surface |
| Slack alert | `supabase/functions/notify-slack-oon/index.ts` | OON-only; requires `SLACK_OON_WEBHOOK_URL` |
| Client GHL workflow bridge | `supabase/functions/appointment-status-webhook/index.ts` | fired for OON and DNC |
| Inbound GHL handling | `supabase/functions/ghl-webhook-handler/index.ts` | lines ~580–616 (side-effect dispatch), ~1461+ (overwrite guard) |
| External REST guard | `supabase/functions/update-appointment-status/index.ts` | lines ~138–152 (403) |
| Sheet sync skip | `supabase/functions/sync-from-sheet/*` | skips OON/DNC |
| Buffalo sync skip | `supabase/functions/sync-buffalo-appointment-statuses/index.ts` | skips OON/DNC |
| IPC completion trigger | DB: `handle_appointment_status_completion` | sets `internal_process_complete = true` |
| QA case ingest | DB: `qa_ingest_terminal_status`, `qa_ingest_review_queue` | `qa_cases.alert_type = 'oon' \| 'do_not_call'` |
| Reschedule block | DB: `patient_reschedule_blocks`, `is_reschedule_blocked()` | admin override supported |
| EMR resolution | DB: `auto_resolve_emr_queue_on_terminal_status` | pending → completed |
