# Verify the ControlHub bridge end-to-end

ControlHub side is live (`receive-external-ticket` deployed, `PATIENTPRO_INBOUND_API_KEY` stored). Now verify it from PatientPro.

## Steps

1. Pick a real QA case ID from `qa_cases` (any status).
2. Invoke PatientPro's `create-controlhub-ticket` edge function with that `case_id` using `supabase--curl_edge_functions`.
3. Confirm the response contains a real ticket id (not `STUB-...`) and `stub: false`.
4. Query `qa_cases` to confirm `controlhub_ticket_id` / `controlhub_ticket_url` / `controlhub_ticket_status` were saved.
5. Query `qa_case_activity` to confirm the `ticket_created` row shows `stub: false`.
6. If the call fails, pull `create-controlhub-ticket` logs and report the exact error (401 = key mismatch, 404 = URL wrong, schema error = payload mismatch) so you can fix it on the ControlHub side.

## Rollback

No code changes in this plan — pure verification. If the bridge is broken, I'll come back with a targeted fix plan.