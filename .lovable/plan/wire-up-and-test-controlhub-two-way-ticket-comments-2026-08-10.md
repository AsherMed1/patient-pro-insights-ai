# Wire up and test ControlHub two-way ticket comments

ControlHub confirmed the `receive-external-comment` endpoint is live at:
`https://afduvfbmompcttptcjli.supabase.co/functions/v1/receive-external-comment`

## Steps

1. **Set the `CONTROLHUB_BASE_URL` secret** in the PatientPro project so `post-controlhub-comment` knows where to POST.
2. **Verify `CONTROLHUB_API_KEY` is already configured**; if missing, request it from the user (ControlHub should have created it, but PatientPro needs the same value).
3. **Test an outbound comment** from a QA case that has a real (non-STUB) ControlHub ticket.
4. **Confirm the comment lands in ControlHub** and that the echo-back guard prevents PatientPro from duplicating it locally.
5. **Check error handling** by simulating a bad ticket ID or missing auth, ensuring QAs see the provider's error message instead of a silent failure.

## Out of scope
- Changing the payload shape (ControlHub already matches what `post-controlhub-comment` sends).
- Adding attachments to replies.

## Success criteria
- A QA can type a reply in the "ControlHub Ticket Comments" box and click **Post comment**.
- The comment appears in ControlHub with the QA's name and a "PatientPro" badge.
- The comment appears locally in the ticket activity list as "Sent from QA Operations".
- Tagged teammates receive bell notifications.
