# Two-way Control Hub ticket comments in QA Operations

Today Control Hub pushes comments into the QA case (ticket activity list, unread dot, mentions), but nothing goes the other way — a QA has to open Control Hub to reply. This adds an outbound reply box in the ticket panel and keeps the two note streams clearly separated.

## What QAs will see

Inside the QA case drawer, the ControlHub ticket panel gets:

- A **Reply to ticket** box directly under the Ticket Activity list, with `@` mention support (same picker as QA notes, including the `@AM` and `@Tech` group aliases).
- A **Post comment** button. On success the comment appears immediately at the top of Ticket Activity, labelled with the QA's name and timestamp, marked as sent from the portal.
- A clear visual split in the drawer:
  - **ControlHub Ticket Comments** — inside the ticket panel, shared with Control Hub (visible to Gloria / AM / Tech there).
  - **Internal Patient Notes** — the existing Notes section below, unchanged and portal-only, with a short "not shared with Control Hub" caption so nobody posts to the wrong place.
- Control Hub replies keep flowing in exactly as they do now.
- If the ticket has no Control Hub id (stub ticket) or the outbound call fails, the box shows the provider's error and the comment is not silently dropped.

## Mentions

- Mentions typed in a ticket comment notify the tagged portal users in the bell (same as QA notes), and the raw `@Full Name` text is sent to Control Hub so it renders there too.
- Group aliases expand to their members for portal notifications and are sent as `@AM` / `@Tech` in the outbound text.

## Technical notes

**New edge function `post-controlhub-comment`** (JWT-verified, called from the drawer)
- Input: `case_id`, `body`, `author_name`, `author_email`, optional `mentions` (resolved user ids/names).
- Loads the case with the service role, requires `controlhub_ticket_id`; rejects stub ids.
- POSTs to `${CONTROLHUB_BASE_URL}/functions/v1/receive-external-comment` with `x-api-key: CONTROLHUB_API_KEY`, payload `{ source: 'patientpro_qa_queue', ticket_id, external_case_id, body, author_name, author_email, mentions, occurred_at }`. Non-OK responses are surfaced with the provider status and body (no bare 500).
- On success inserts a `qa_ticket_events` row (`event_type: 'comment'`, `direction: 'outbound'`, author = QA name) so it renders in the same timeline, updates `qa_cases.controlhub_ticket_last_activity` / `_last_activity_at`, and does **not** set the unread flag.
- Inserts `qa_note_mentions` rows (`kind: 'mention'`, `case_id`) for tagged portal users via the existing notification shape.

**Migration**
- Add `direction text not null default 'inbound'` to `qa_ticket_events` so portal-sent comments can be styled differently (and skipped by the inbound dedupe).

**Frontend `src/components/admin/QATicketPanel.tsx`**
- Add the reply composer using `MentionTextarea` + `useMentionableUsers`, a submit handler calling the new function via `supabase.functions.invoke` (reading `FunctionsHttpError` context for real errors), optimistic append plus realtime reconciliation.
- Render outbound events with a "Sent from QA Operations" marker and mention chips via `src/lib/mentions.tsx`.
- Section headers: "ControlHub Ticket Comments" here, "Internal Patient Notes" on the existing notes block in `QAOperationsQueue.tsx`.

**Inbound side (`controlhub-ticket-webhook`)** — unchanged behaviour, except the existing dedupe also ignores echo-backs of our own outbound comments (same ticket id + body within 2 minutes).

## Dependency to confirm

The outbound comment endpoint must exist on the Control Hub side (`receive-external-comment`, keyed by `ticket_id`). If Control Hub uses a different path or payload, say so and I'll match it — until it exists, comments will fail with the provider's error rather than posting.

## Not included

- Editing or deleting a comment after it is posted.
- Attachments on replies (ticket creation still supports them).
