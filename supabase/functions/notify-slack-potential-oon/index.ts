import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  appointmentId: string;
  projectName?: string | null;
  leadName?: string | null;
  phone?: string | null;
  calendarName?: string | null;
  appointmentDate?: string | null;
  route?: 'setter' | 'patient';
  matches?: Array<{ matched_on: string; matched_value: string; plan_name?: string | null; note?: string | null }>;
}

const QA_URL = "https://patientproclients.com/?tab=qa-queue";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const payload: Payload = await req.json();
    const webhook = Deno.env.get('SLACK_POTENTIAL_OON_WEBHOOK_URL')
      || Deno.env.get('SLACK_OON_WEBHOOK_URL');
    if (!webhook) throw new Error('SLACK_POTENTIAL_OON_WEBHOOK_URL not configured');

    const matchLines = (payload.matches || [])
      .map((m) => `• ${m.matched_on === 'group' ? 'Group #' : 'Plan'}: \`${m.matched_value}\`${m.plan_name ? ` → *${m.plan_name}*` : ''}${m.note ? ` — _${m.note}_` : ''}`)
      .join('\n') || '• (no detail)';

    const deepLink = `${QA_URL}&appt=${encodeURIComponent(payload.appointmentId)}`;

    const slackPayload = {
      text: `Potential OON insurance — ${payload.leadName || 'Patient'} (${payload.projectName || 'N/A'})`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "⚠️ Potential OON Insurance", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Account:*\n${payload.projectName || 'N/A'}` },
            { type: "mrkdwn", text: `*Patient:*\n${payload.leadName || 'N/A'}` },
            { type: "mrkdwn", text: `*Phone:*\n${payload.phone || 'N/A'}` },
            { type: "mrkdwn", text: `*Calendar:*\n${payload.calendarName || 'N/A'}` },
            { type: "mrkdwn", text: `*Appt Date:*\n${payload.appointmentDate || 'N/A'}` },
            { type: "mrkdwn", text: `*Source:*\n${payload.route === 'setter' ? 'Setter Submitted' : 'Patient Submitted'}` },
          ],
        },
        { type: "section", text: { type: "mrkdwn", text: `*Matched rules:*\n${matchLines}` } },
        {
          type: "actions",
          elements: [{
            type: "button", style: "danger",
            text: { type: "plain_text", text: "Open QA Operations", emoji: true },
            url: deepLink,
          }],
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "Record is held from the client portal until QA verifies the insurance." }],
        },
      ],
    };

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[notify-slack-potential-oon] slack error', res.status, body);
      return new Response(JSON.stringify({ error: 'Slack error', status: res.status, details: body }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[notify-slack-potential-oon] error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
