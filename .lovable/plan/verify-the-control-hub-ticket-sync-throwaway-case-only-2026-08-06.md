# Verify the Control Hub ticket sync (throwaway case only)

No real QA case is touched. I create a disposable test case, drive it through the webhook, then delete it.

## 1. Visual check you can do now (no data written) — 1 minute

1. Open QA Operations Queue.
2. Look at the Ticket column: cases with a ticket now show the ticket id plus a status badge ("Open" for all 19 existing ones, since Control Hub hasn't sent anything yet).
3. Click Open on one of those cases — the drawer shows a "ControlHub ticket" panel with the status badge, assignee, "Open ticket" link, and a "Ticket activity" list that currently reads "No updates received from ControlHub yet."

That confirms the UI half. It cannot confirm the inbound half, because no real events have arrived.

## 2. End-to-end test on a throwaway case

1. **Create** a test QA case (clearly labelled, e.g. patient name "ZZ Webhook Test", a test ticket id, status `open`). No real appointment or patient is linked.
2. **Comment event** — POST to the webhook; confirm a `qa_ticket_events` row appears, the case's latest activity text and unread flag update.
3. **Status change to In Progress** — confirm the badge changes in both the queue row and the drawer panel, and the activity list updates live while the drawer is open.
4. **Duplicate delivery** — re-POST the same event; confirm the response is `{ duplicate: true }` and no second row is inserted.
5. **Resolved event** — confirm the case auto-completes (`workflow_status = completed`, `completed_at`, `date_resolved` set, default resolution) and a `ticket_resolved` row lands in `qa_case_activity`.
6. **Unauthorized check** — POST with a wrong secret; expect 401.
7. **Clean up** — delete the test case plus its `qa_ticket_events` and `qa_case_activity` rows. Verify nothing remains in the queue.

I'll report each step's result plus a screenshot of the drawer showing live ticket activity.

## Prerequisite

The webhook needs `CONTROLHUB_WEBHOOK_SECRET` saved. If it isn't set yet the endpoint returns 500 and step 2 can't run — I'll request it before starting.

## Technical details

- Endpoint: `POST https://bhabbokbhnqioykjimix.supabase.co/functions/v1/controlhub-ticket-webhook`, header `x-webhook-secret`.
- Test bodies use `external_case_id` (the throwaway case UUID) so the lookup path Control Hub will actually use gets exercised.
- Verification reads: `qa_ticket_events`, the `controlhub_ticket_*` columns on `qa_cases`, `qa_case_activity`, plus edge function logs for any 4xx/5xx.
- Deletes are scoped by the throwaway case id only.
