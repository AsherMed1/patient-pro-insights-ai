import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversationId, 
      projectName, 
      userEmail, 
      userName, 
      lastMessage 
    } = await req.json();

    console.log('[notify-slack-support] Request received:', { conversationId, projectName, userName });

    const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!SLACK_WEBHOOK_URL) {
      console.error('[notify-slack-support] SLACK_WEBHOOK_URL not configured');
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    // Get the portal URL from environment or use default
    const PORTAL_BASE_URL = Deno.env.get('PORTAL_BASE_URL') || 'https://bhabbokbhnqioykjimix.lovable.app';
    const portalLink = `${PORTAL_BASE_URL}/?tab=support-queue`;

    // Format Slack message with blocks for rich formatting
    const slackPayload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Live Support Requested",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Project:*\n${projectName || 'Unknown'}` },
            { type: "mrkdwn", text: `*User:*\n${userName || userEmail || 'Anonymous'}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Last Message:*\n>${lastMessage || 'No message context'}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📋 Open Support Queue",
                emoji: true
              },
              url: portalLink,
              style: "primary"
            }
          ]
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Conversation ID: \`${conversationId || 'N/A'}\`` },
            { type: "mrkdwn", text: `Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET` }
          ]
        }
      ]
    };

    console.log('[notify-slack-support] Sending to Slack...');

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notify-slack-support] Slack API error:', response.status, errorText);
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log(`[notify-slack-support] ✓ Notification sent for conversation: ${conversationId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-slack-support] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
