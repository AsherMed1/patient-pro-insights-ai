import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OONNotificationPayload {
  firstName: string;
  lastName: string;
  phone: string;
  calendarName: string;
  projectName: string;
  appointmentId: string;
}

// Extract service type from calendar name
const extractServiceType = (calendarName: string): string => {
  const lowerCalendar = calendarName.toLowerCase();
  if (lowerCalendar.includes('gae') || lowerCalendar.includes('knee')) return 'GAE';
  if (lowerCalendar.includes('ufe') || lowerCalendar.includes('fibroid')) return 'UFE';
  if (lowerCalendar.includes('pae') || lowerCalendar.includes('prostate')) return 'PAE';
  if (lowerCalendar.includes('pfe') || lowerCalendar.includes('pelvic')) return 'PFE';
  return 'Unknown';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: OONNotificationPayload = await req.json();
    console.log('[notify-slack-oon] Received payload:', JSON.stringify(payload));

    const { firstName, lastName, phone, calendarName, projectName, appointmentId } = payload;

    const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!SLACK_WEBHOOK_URL) {
      console.error('[notify-slack-oon] SLACK_WEBHOOK_URL not configured');
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    // Extract service type from calendar name
    const serviceType = extractServiceType(calendarName || '');

    // Format account sheet name
    const accountSheetName = `${projectName} | Tracking Sheet ${serviceType}`;

    // Format Slack message with blocks for rich formatting
    const slackPayload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 ACTION REQUIRED",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${firstName}* is now OON.`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*First Name :*\n${firstName}` },
            { type: "mrkdwn", text: `*Last Name :*\n${lastName}` }
          ]
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Call:*\n${phone || 'N/A'}` },
            { type: "mrkdwn", text: `*Calendar:*\n${calendarName || 'N/A'}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Account Sheet name :*\n${accountSheetName}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "⏰ *Follow up within 5 minutes.*"
          }
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Appointment ID: \`${appointmentId || 'N/A'}\`` },
            { type: "mrkdwn", text: `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET` }
          ]
        }
      ]
    };

    console.log('[notify-slack-oon] Sending to Slack...');

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notify-slack-oon] Slack API error:', response.status, errorText);
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log(`[notify-slack-oon] ✓ OON notification sent for: ${firstName} ${lastName}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-slack-oon] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
