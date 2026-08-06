# Verify the Control Hub ticket sync

Two ways to check it: a quick visual check you can do now, and an end-to-end test I run against the live webhook (needs your go-ahead, since it writes real data).

## 1. Visual check (no data written) — 1 minute

1. Open QA Operations Queue.
2. Look at the Ticket column: cases with a ticket now show the ticket id plus a status badge ("Open" for all 19 existing ones, since Control Hub hasn't sent anything yet).
3. Click Open on one of those cases — the drawer shows a "ControlHub ticket" panel with the status badge, assignee, "Open ticket" link, and a "Ticket activity" list that currently reads "No updates received from ControlHub yet."

That confirms the UI half. It cannot confirm the inbound half, because no real events have arrived.

## 2. End-to-end test (writes data) — needs approval

Using a real case that already has a ticket (`b5216d24-515e-4f78-8725-9facd89034ae`, ticket `45fd68df…`, currently `pending_escalated`), I would:

1. POST a `comment` event to the webhook and confirm: a row appears in `qa_ticket_events`, the case's latest activity and unread flag update, and the drawer's activity list updates live while open.
2. POST a `status_change` to `in_progress` and confirm the badge changes in both the queue and the drawer.
3. Re-POST the same event to confirm the duplicate guard returns `{ duplicate: true }` and does not double-insert.
4. POST a `resolved` event and confirm the case auto-completes (`workflow_status = completed`, `date_resolved` set) and a `ticket_resolved` row lands in `qa_case_activity`.
5. Roll everything back: delete the test `qa_ticket_events` and `qa_case_activity` rows and restore the case to `pending_escalated` with its original ticket fields.

Two things to decide:

- Testing against a real case briefly moves it to completed before rollback. Safer alternative: I create a throwaway QA case, run the same 4 steps against it, then delete it — no real record is touched.
- The webhook requires `CONTROLHUB_WEBHOOK_SECRET`. If it isn't set yet, the endpoint returns 500 and nothing can be tested until it's saved.

## Technical details

- Endpoint: `POST https://bhabbokbhnqioykjimix.supabase.co/functions/v1/controlhub-ticket-webhook`, header `x-webhook-secret`.
- Test bodies use `external_case_id` (the QA case UUID) so the lookup path Control Hub will actually use gets exercised.
- Verification reads: `qa_ticket_events`, the `controlhub_ticket_*` columns on `qa_cases`, `qa_case_activity`, plus edge function logs for any 4xx/5xx.
