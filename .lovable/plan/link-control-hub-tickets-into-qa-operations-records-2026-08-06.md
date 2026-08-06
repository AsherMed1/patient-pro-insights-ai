# Link Control Hub Tickets into QA Operations Records

Today a QA case stores only the ticket id, url, and a status that is written once at creation time — all 19 existing tickets still read "open" because nothing ever updates them. This adds a live, two-system-free view of ticket progress inside the QA record.

## What QAs will see

Inside a QA case drawer, a **Ticket** panel showing:
- Ticket id with a direct "Open in Control Hub" link
- Current status badge (Open, In Progress, Awaiting Response, Resolved, Closed)
- Assignee and last-updated time
- Latest comment/activity text
- An unread dot on the case row and on the panel when Control Hub has posted something the QA hasn't seen yet; opening the panel clears it
- A **Ticket Activity** list (separate from QA notes) with every status change and comment in chronological order

In the queue table, the existing Ticket column gains the status badge and the unread indicator so QAs can triage without opening each case.

## How updates arrive

Control Hub pushes to a new endpoint here on every ticket status change, comment, or assignment. Each event is stored, the case's ticket fields are refreshed, and the unread flag is raised.

When Control Hub reports the ticket **Resolved** (or Closed):
- The QA case is automatically moved to `completed`
- `date_resolved` is set, and resolution is recorded as "Resolved via Control Hub ticket" if the QA left it blank
- A ticket-resolution entry is written to the case activity timeline so the audit history shows who/what closed it

Nothing is deleted or overwritten: every inbound event is preserved, so the full status/response history stays auditable.

## Technical details

**Database**
- New table `qa_ticket_events`: `case_id`, `ticket_id`, `event_type` (status_change | comment | assignment), `status`, `author_name`, `body`, `occurred_at`, `raw` jsonb. Read access for the same roles that can read `qa_cases`; writes only from the service role.
- New columns on `qa_cases`: `controlhub_ticket_last_activity_at`, `controlhub_ticket_last_activity` (text), `controlhub_ticket_assignee`, `controlhub_ticket_unread` (boolean default false), `controlhub_ticket_seen_at`.
- Realtime enabled on `qa_ticket_events` so an open drawer updates live.

**Edge function `controlhub-ticket-webhook`** (new, public, verifies a shared secret header)
- Validates payload with Zod: `external_case_id` or `ticket_id`, `event_type`, `status`, `comment`, `author_name`, `occurred_at`.
- Resolves the QA case by `controlhub_ticket_id` (fallback `external_case_id`), inserts a `qa_ticket_events` row, updates the case's ticket fields, sets `controlhub_ticket_unread = true`.
- On a resolved/closed status: sets `workflow_status = 'completed'`, `completed_at`, `date_resolved`, default `resolution_type`, and inserts a `qa_case_activity` row.
- Idempotent on (ticket_id, event_type, occurred_at) so retries don't duplicate.
- Requires one new secret, `CONTROLHUB_WEBHOOK_SECRET`, which the same value must be configured on the Control Hub side. I'll surface the endpoint URL and request it after the endpoint is deployed.

**Frontend `src/components/admin/QAOperationsQueue.tsx`**
- Extend the `QACase` type and select list with the new ticket columns.
- New `TicketPanel` sub-component rendering status badge, assignee, latest activity, link, and the ticket event list (fetched per case on drawer open, subscribed to realtime).
- Mark seen: on drawer open, clear `controlhub_ticket_unread` and stamp `controlhub_ticket_seen_at`.
- Queue table Ticket column: badge + unread dot; add ticket status to the sortable key.

**Outbound side (`create-controlhub-ticket`)**
- Already sends `external_case_id`; no change needed beyond returning the initial status, which it does.

## Not included
- Replying to the Control Hub ticket from inside QA Operations (one-way inbound only).
- Any Slack changes.
