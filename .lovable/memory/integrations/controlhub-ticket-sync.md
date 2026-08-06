---
name: ControlHub Ticket Sync
description: Inbound ControlHub webhook keeps QA Operations cases in sync with ticket status, comments, unread indicator, and auto-completes the case on resolve.
type: feature
---

Outbound: `create-controlhub-ticket` creates the ticket and stores `controlhub_ticket_id/url/status` on `qa_cases`.

Inbound: `controlhub-ticket-webhook` (public, requires `x-webhook-secret` = `CONTROLHUB_WEBHOOK_SECRET`; Bearer token also accepted).
Payload: `ticket_id` (or `external_case_id` = qa_cases.id), `event_type` (status_change | comment | assignment), `status`, `comment`/`body`, `author_name`, `assignee_name`, `ticket_url`, `occurred_at`.
Statuses normalize to: open, in_progress, awaiting_response, resolved, closed.

Each event inserts into `qa_ticket_events` (deduped on ticket_id + event_type + occurred_at + md5(body)) and updates `qa_cases`:
`controlhub_ticket_status`, `controlhub_ticket_last_activity`, `..._last_activity_at`, `..._assignee`, `..._unread = true`.
Resolved/closed auto-completes the case (workflow_status=completed, completed_at, date_resolved, default resolution_type) and writes a `ticket_resolved` row to `qa_case_activity`. Every other event writes `ticket_update`.

UI: `src/components/admin/QATicketPanel.tsx` renders status badge, assignee, latest activity, ticket link, and the realtime Ticket Activity list inside the QA case drawer; opening the drawer clears the unread flag (`controlhub_ticket_seen_at`). Queue Ticket column shows badge + unread dot.

Mentions: comment events also resolve `@mentions` (explicit `mentions: [{email|name}]` array, or `@Full Name` / `@email` in the body) against QA-role users only (admin, agent, qa_specialist, va). Matches create a `qa_case_notes` row prefixed `[Control Hub]` with `@[Name](uuid)` tokens, `qa_note_mentions` rows (unread, `mentioned_by_name` = ticket author, `mentioned_by_user_id` null), and `mention` activity rows — so the portal Mentions bell notifies them. Unmatched or ambiguous names are ignored; mention failures never fail the webhook.
