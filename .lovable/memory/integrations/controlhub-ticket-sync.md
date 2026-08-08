---
name: ControlHub Ticket Sync
description: Two-way ControlHub ticket sync — inbound webhook keeps QA cases in sync, and QAs reply to the ticket from the QA Operations drawer.
type: feature
---

Outbound ticket creation: `create-controlhub-ticket` creates the ticket and stores `controlhub_ticket_id/url/status` on `qa_cases`.

Inbound: `controlhub-ticket-webhook` (public, requires `x-webhook-secret` = `CONTROLHUB_WEBHOOK_SECRET`; Bearer token also accepted).
Payload: `ticket_id` (or `external_case_id` = qa_cases.id), `event_type` (status_change | comment | assignment), `status`, `comment`/`body`, `author_name`, `assignee_name`, `ticket_url`, `occurred_at`.
Statuses normalize to: open, in_progress, awaiting_response, resolved, closed.

Each event inserts into `qa_ticket_events` (deduped on ticket_id + event_type + occurred_at + md5(body)) and updates `qa_cases`:
`controlhub_ticket_status`, `controlhub_ticket_last_activity`, `..._last_activity_at`, `..._assignee`, `..._unread = true`.
Resolved/closed auto-completes the case and writes `ticket_resolved` to `qa_case_activity`; every other event writes `ticket_update`.
Inbound comments matching an outbound comment (same case, same body, within 2 minutes) are skipped as echo-backs.

Outbound comments (QA → ControlHub): `post-controlhub-comment` (JWT-verified). Input `case_id`, `body`, `author_name`, `author_email`, `mentions[{id,name}]`.
POSTs to `${CONTROLHUB_BASE_URL}/functions/v1/receive-external-comment` with `x-api-key`. Stub ticket ids (`STUB-`) are rejected. Provider errors are relayed with status + body.
On success it inserts a `qa_ticket_events` row with `direction='outbound'` (inbound rows default to `'inbound'`), refreshes the case's last-activity fields without setting unread, inserts `qa_note_mentions` bell rows for tagged users, and logs `ticket_comment_sent` activity.

UI: `src/components/admin/QATicketPanel.tsx` renders status badge, assignee, latest activity, ticket link, the realtime "ControlHub Ticket Comments" list (outbound rows badged "Sent from QA Operations"), and a `MentionTextarea` reply composer. The drawer's separate "Internal Patient Notes" section stays portal-only. Opening the drawer clears the unread flag.

Mentions: comment events also resolve `@mentions` (explicit `mentions` array, or `@Full Name` / `@email` in the body) against QA-role users only (admin, agent, qa_specialist, va), plus the `@AM` / `@Tech` group aliases. Matches create a `qa_case_notes` row prefixed `[Control Hub]`, `qa_note_mentions` rows, and `mention` activity rows. Mention failures never fail the webhook.
