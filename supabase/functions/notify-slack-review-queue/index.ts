import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewQueuePayload {
  appointmentId: string;
  projectName: string;
  leadName: string;
  leadEmail?: string | null;
  phone?: string | null;
  calendarName?: string | null;
  status?: string | null;
}

const REVIEW_QUEUE_URL = "https://patientproclients.com/?tab=review-queue";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ReviewQueuePayload = await req.json();
    console.log('[notify-slack-review-queue] payload:', JSON.stringify(payload));

    const webhook = Deno.env.get('SLACK_REVIEW_QUEUE_WEBHOOK_URL');
    if (!webhook) throw new Error('SLACK_REVIEW_QUEUE_WEBHOOK_URL not configured');

    const {
      appointmentId,
      projectName,
      leadName,
      leadEmail,
      phone,
      calendarName,
      status,
    } = payload;

    const deepLink = `${REVIEW_QUEUE_URL}&appt=${encodeURIComponent(appointmentId)}`;

    const slackPayload = {
      text: `Appointment Verification Required — ${leadName} (${projectName})`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🔔 Appointment Verification Required", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Account:*\n${projectName || 'N/A'}` },
            { type: "mrkdwn", text: `*Patient:*\n${leadName || 'N/A'}` },
            { type: "mrkdwn", text: `*Email:*\n${leadEmail || 'N/A'}` },
            { type: "mrkdwn", text: `*Phone:*\n${phone || 'N/A'}` },
            { type: "mrkdwn", text: `*Calendar:*\n${calendarName || 'N/A'}` },
            { type: "mrkdwn", text: `*Status:*\n${status || 'Pending'}` },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              style: "primary",
              text: { type: "plain_text", text: "Open Review Queue", emoji: true },
              url: deepLink,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "*Setter Instructions:* Review details and take action — *Approve* if verified, *Decline* if duplicate/spam/test/wrong project, *Mark as OON* if insurance is out of network.",
            },
          ],
        },
      ],
    };

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('[notify-slack-review-queue] Slack error:', res.status, t);
      throw new Error(`Slack webhook failed: ${res.status}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-slack-review-queue] error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
