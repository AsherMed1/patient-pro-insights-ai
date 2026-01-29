import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarUpdatePayload {
  projectName: string;
  calendarName: string;
  date: string;
  timeRanges: string[];
  reason?: string;
  blockedBy: string;
  isFullDay: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: CalendarUpdatePayload = await req.json();
    console.log('[notify-calendar-update] Received payload:', JSON.stringify(payload));

    const {
      projectName,
      calendarName,
      date,
      timeRanges,
      reason,
      blockedBy,
      isFullDay,
    } = payload;

    const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('[notify-calendar-update] SLACK_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Slack webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format time ranges for display
    const timeRangesText = timeRanges.join('\n');
    const fullDayTag = isFullDay ? ' 🚨 *FULL DAY BLOCK*' : '';

    // Build Slack message with rich formatting
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 Calendar Update: Reserved Time Block',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Clinic:*\n${projectName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Calendar:*\n${calendarName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Date:*\n${date}`,
            },
            {
              type: 'mrkdwn',
              text: `*Blocked By:*\n${blockedBy}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Time Blocked:*${fullDayTag}\n${timeRangesText}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n${reason || 'Not specified'}`,
          },
        },
      ],
    };

    // Add action context for full-day blocks
    if (isFullDay) {
      slackMessage.blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ *Action Required:* Please update the cheatsheet for this clinic.',
          },
        ],
      } as any);
    }

    // Send to Slack
    console.log('[notify-calendar-update] Sending to Slack...');
    const slackResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error('[notify-calendar-update] Slack error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Slack error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[notify-calendar-update] ✓ Notification sent successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-calendar-update] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
