# Use an Isolated Slack Incoming Webhook

The connector picker is still failing and no Slack connection was linked. The project already has a secure `SLACK_OON_WEBHOOK_URL` secret, and both OON notification functions already use it, so the fastest fallback is to replace that secret with a webhook dedicated to `#potential-oon-alerts`.

## Setup

1. In Slack, go to https://api.slack.com/apps and select **Create New App → From scratch**.
2. Name it **PatientPro OON Alerts** and select the **Patient Pro** workspace.
3. Open **Incoming Webhooks**, turn them on, and choose **Add New Webhook to Workspace**.
4. Select only `#potential-oon-alerts`, then copy the generated webhook URL.
5. Open the secure secret form for `SLACK_OON_WEBHOOK_URL` and paste the URL there. Do not paste it into chat.
6. Send one clearly labeled test Potential OON alert and confirm it appears only in `#potential-oon-alerts`.

## Safety

- This webhook is scoped to `#potential-oon-alerts`; it does not read, modify, or post to other channels.
- Existing important Slack channels and the current Lovable App installation remain untouched.
- The webhook URL stays server-side in Supabase Edge Function secrets.

## Technical note

`notify-slack-oon` reads `SLACK_OON_WEBHOOK_URL` directly. `notify-slack-potential-oon` first checks its optional dedicated webhook and otherwise falls back to `SLACK_OON_WEBHOOK_URL`. Before testing, verify whether the optional `SLACK_POTENTIAL_OON_WEBHOOK_URL` exists; if it does, update it to the same dedicated URL so both alert types route consistently.