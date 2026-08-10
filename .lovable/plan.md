# Fix the Slack Connector Link and Route OON Alerts

The Slack channel setup is correct. The workspace currently has two Slack connections:

- **Slack** — healthy and authenticated to the Patient Pro workspace as the Lovable App.
- **Slack (1)** — stale and returning `invalid_auth`.

Neither connection is currently linked to this project. The connector-loading error happened before linking completed.

## Steps

1. **Link only the healthy connection**
   - Retry the project Slack connection picker and select **Slack**, not **Slack (1)**.
   - Do not reconnect, disconnect, or modify the healthy workspace installation.
   - If the connection card itself still cannot load, stop retrying and direct the user to workspace Connector settings / Support because that is a connector UI catalog issue rather than a Slack channel or app-code issue.

2. **Verify the linked secrets**
   - Confirm the linked connection provides `SLACK_API_KEY` and `LOVABLE_API_KEY` to the project backend.
   - Keep both values server-only.

3. **Configure the destination explicitly**
   - Store `#potential-oon-alerts` as the OON alert destination.
   - Resolve and use the channel ID when posting, avoiding accidental delivery to similarly named channels.

4. **Move both OON notification functions to the connector gateway**
   - Update `notify-slack-potential-oon` and `notify-slack-oon` to call Slack `chat.postMessage` through the connector gateway.
   - Preserve their current message blocks and QA deep link.
   - Check both HTTP failures and Slack `{ ok: false }` responses.

5. **Deploy and verify safely**
   - Deploy only the two notification functions.
   - Send one clearly labeled test message to `#potential-oon-alerts` and confirm the returned channel matches the configured channel.
   - Do not post to, change, leave, archive, or otherwise modify any other Slack channel.

## Safety

The Lovable App being present in other important channels will not be affected. Channel membership only grants access; these notification functions will explicitly target `#potential-oon-alerts` and perform no operations on other channels.