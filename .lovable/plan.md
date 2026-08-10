# Route OON Alerts Through the Slack Connector

Switch the OON and Potential OON Slack alerts from incoming webhooks to the Lovable Slack connector so they post to `#potential-oon-alerts`. Adding the Lovable App to additional channels is safe — it only grants posting permission; alerts still only go where the code sends them.

## Steps

1. **Link a Slack connection to the project**
   - Use `standard_connectors--connect` with `connector_id: slack`.
   - Let the user pick one of the two existing workspace Slack connections (both are OAuth2 / gateway-backed).
   - After linking, `SLACK_API_KEY` will be available as a project secret.

2. **Add channel configuration**
   - Add a new runtime secret / env var `SLACK_OON_CHANNEL` defaulting to `#potential-oon-alerts`.
   - This keeps the target channel explicit and easy to change later without a code deploy.

3. **Update `notify-slack-oon` edge function**
   - Replace the `SLACK_OON_WEBHOOK_URL` fetch with a call to the Lovable connector gateway:
     - `POST https://connector-gateway.lovable.dev/slack/api/chat.postMessage`
     - Headers: `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${SLACK_API_KEY}`
     - Body: `channel`, `text`, and `blocks` (reuse the existing block payload).
   - Preserve the existing rich block formatting.
   - Surface gateway/provider errors in the response.

4. **Update `notify-slack-potential-oon` edge function**
   - Same gateway migration as above.
   - Post to the same `#potential-oon-alerts` channel (or a separate configurable channel if desired).
   - Keep the deep-link button and matched-rules block payload.

5. **Update callers if needed**
   - Verify `evaluate-potential-oon` and the OON status-change paths still invoke the functions with the same payloads.
   - No payload changes required.

6. **Deploy and test**
   - Deploy the updated edge functions.
   - Trigger a test Potential OON flag (reuse the existing `ZZTEST` throwaway records or create a new one) and confirm the message arrives in `#potential-oon-alerts`.
   - Optionally trigger an actual OON status change to test `notify-slack-oon`.

## Outcome

- OON and Potential OON alerts are sent through the managed Slack connector instead of a fragile incoming webhook.
- `#potential-oon-alerts` receives the same formatted alerts.
- Existing Lovable App installations in other channels remain unaffected.
