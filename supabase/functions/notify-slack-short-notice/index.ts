import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShortNoticePayload {
  appointmentId: string;
  projectName: string;
  leadName: string;
  ghlId?: string;
  ghlLocationId?: string;
  appointmentDatetime: string;
  createdDatetime: string;
  hoursDifference: number;
  status?: string;
  calendarName?: string;
  phone?: string;
  timezone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ShortNoticePayload = await req.json();
    console.log('[notify-slack-short-notice] Received payload:', JSON.stringify(payload));

    const {
      appointmentId,
      projectName,
      leadName,
      ghlId,
      ghlLocationId,
      appointmentDatetime,
      createdDatetime,
      hoursDifference,
      status,
      calendarName,
      phone,
      timezone,
    } = payload;

    // Log to short_notice_alerts table
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: dbError } = await supabase
      .from('short_notice_alerts')
      .insert({
        appointment_id: appointmentId,
        project_name: projectName,
        lead_name: leadName,
        appointment_datetime: appointmentDatetime,
        created_datetime: createdDatetime,
        hours_difference: hoursDifference,
        ghl_id: ghlId || null,
        slack_sent: false,
      });

    if (dbError) {
      console.error('[notify-slack-short-notice] DB insert error:', dbError);
    }

    // Send Slack alert
    const SLACK_SHORT_NOTICE_WEBHOOK_URL = Deno.env.get('SLACK_SHORT_NOTICE_WEBHOOK_URL');
    if (!SLACK_SHORT_NOTICE_WEBHOOK_URL) {
      console.warn('[notify-slack-short-notice] SLACK_SHORT_NOTICE_WEBHOOK_URL not configured, skipping Slack');
      return new Response(
        JSON.stringify({ success: true, slack_sent: false, reason: 'webhook not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hoursText = hoursDifference < 1
      ? `${Math.round(hoursDifference * 60)}m (biz)`
      : `${Math.round(hoursDifference)} biz hrs`;

    // Build GHL link using v2 format with locationId
    let ghlLink = 'N/A';
    if (ghlId && ghlLocationId) {
      ghlLink = `<https://app.gohighlevel.com/v2/location/${ghlLocationId}/contacts/detail/${ghlId}|View in GHL>`;
    } else if (ghlId) {
      ghlLink = `<https://app.gohighlevel.com/contacts/detail/${ghlId}|View in GHL>`;
    }

    // Use project timezone for display, default to America/Chicago
    const displayTimezone = timezone || 'America/Chicago';
    const tzAbbreviations: Record<string, string> = {
      'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
      'America/Los_Angeles': 'PT', 'America/Phoenix': 'MT', 'US/Eastern': 'ET',
      'US/Central': 'CT', 'US/Mountain': 'MT', 'US/Pacific': 'PT',
    };
    const tzLabel = tzAbbreviations[displayTimezone] || displayTimezone;

    let apptDate = 'N/A';
    try {
      apptDate = appointmentDatetime
        ? new Date(appointmentDatetime).toLocaleString('en-US', { timeZone: displayTimezone })
        : 'N/A';
    } catch {
      apptDate = appointmentDatetime
        ? new Date(appointmentDatetime).toLocaleString('en-US', { timeZone: 'America/Chicago' })
        : 'N/A';
    }

    const slackPayload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "⚡ SHORT-NOTICE APPOINTMENT",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${leadName}* — booked *${hoursText} before appt*`
          }
        },
        { type: "divider" },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Clinic:*\n${projectName}` },
            { type: "mrkdwn", text: `*Status:*\n${status || 'Unconfirmed'}` }
          ]
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Appointment:*\n${apptDate} ${tzLabel}` },
            { type: "mrkdwn", text: `*Calendar:*\n${calendarName || 'N/A'}` }
          ]
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Phone:*\n${phone || 'N/A'}` },
            { type: "mrkdwn", text: `*GHL:*\n${ghlLink}` }
          ]
        },
        { type: "divider" },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Appointment ID: \`${appointmentId || 'N/A'}\`` },
            { type: "mrkdwn", text: `Alert sent: ${new Date().toLocaleString('en-US', { timeZone: displayTimezone })} ${tzLabel}` }
          ]
        }
      ]
    };

    const response = await fetch(SLACK_SHORT_NOTICE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notify-slack-short-notice] Slack error:', response.status, errorText);
      throw new Error(`Slack API error: ${response.status}`);
    }

    // Update slack_sent flag
    if (!dbError) {
      await supabase
        .from('short_notice_alerts')
        .update({ slack_sent: true })
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    console.log(`[notify-slack-short-notice] ✓ Alert sent for: ${leadName} (${hoursText} notice)`);

    return new Response(
      JSON.stringify({ success: true, slack_sent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notify-slack-short-notice] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
