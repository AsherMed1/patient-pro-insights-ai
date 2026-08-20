import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelledPatient {
  appointmentId: string;
  leadName: string;
  phone?: string | null;
  requestedTime?: string | null;
  dateOfAppointment?: string | null;
  calendarName?: string | null;
  ghlId?: string | null;
}

interface Payload {
  projectName: string;
  blockedDate: string;          // human readable, e.g. "April 21, 2026"
  timeRanges: string[];         // e.g. ["9:00 AM - 12:00 PM"]
  blockReason?: string | null;
  reservedBy?: string | null;
  ghlLocationId?: string | null;
  timezone?: string | null;
  patients: CancelledPatient[];
}

const tzAbbreviations: Record<string, string> = {
  'America/New_York': 'ET', 'America/Chicago': 'CT', 'America/Denver': 'MT',
  'America/Los_Angeles': 'PT', 'America/Phoenix': 'MT', 'US/Eastern': 'ET',
  'US/Central': 'CT', 'US/Mountain': 'MT', 'US/Pacific': 'PT',
};

const formatTime = (t?: string | null): string => {
  if (!t) return 'time n/a';
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  const h = parseInt(m[1], 10);
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${m[2]} ${ampm}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();
    const {
      projectName,
      blockedDate,
      timeRanges = [],
      blockReason,
      reservedBy,
      ghlLocationId,
      timezone,
      patients = [],
    } = payload;

    if (!patients.length) {
      return new Response(
        JSON.stringify({ success: true, slack_sent: false, reason: 'no cancelled patients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dedicated channel when configured, otherwise fall back to the existing
    // calendar-updates channel so alerts are never silently dropped.
    const webhookUrl =
      Deno.env.get('SLACK_BLOCK_CANCELLATION_WEBHOOK_URL') ||
      Deno.env.get('SLACK_CALENDAR_UPDATES_WEBHOOK_URL');

    if (!webhookUrl) {
      console.warn('[notify-slack-block-cancellations] No Slack webhook configured, skipping');
      return new Response(
        JSON.stringify({ success: true, slack_sent: false, reason: 'webhook not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tzLabel = timezone ? (tzAbbreviations[timezone] || timezone) : '';

    const patientLines = patients.map((p) => {
      const time = formatTime(p.requestedTime);
      const link = p.ghlId
        ? ghlLocationId
          ? ` — <https://app.gohighlevel.com/v2/location/${ghlLocationId}/contacts/detail/${p.ghlId}|GHL>`
          : ` — <https://app.gohighlevel.com/contacts/detail/${p.ghlId}|GHL>`
        : '';
      return `• *${p.leadName || 'Unknown patient'}* — ${p.phone || 'no phone'} — ${time}${tzLabel ? ` ${tzLabel}` : ''}${p.calendarName ? ` — ${p.calendarName}` : ''}${link}`;
    });

    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 BLOCKED TIME — UNCONFIRMED APPTS CANCELLED',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${patients.length}* unconfirmed appointment(s) were auto-cancelled at *${projectName}*. These patients need a callback to rebook.`,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Blocked date:*\n${blockedDate || 'N/A'}` },
            { type: 'mrkdwn', text: `*Time:*\n${timeRanges.length ? timeRanges.join(', ') : 'All day'}` },
          ],
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Block reason:*\n${blockReason || 'Not provided'}` },
            { type: 'mrkdwn', text: `*Reserved by:*\n${reservedBy || 'Portal user'}` },
          ],
        },
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Patients to contact:*\n${patientLines.join('\n')}` },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: 'Cancellation reason sent to GHL: `Auto-cancelled: Clinic blocked time`' },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[notify-slack-block-cancellations] Slack error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, slack_sent: false, status: response.status, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[notify-slack-block-cancellations] ✓ Alert sent for ${patients.length} patient(s) at ${projectName}`);

    return new Response(
      JSON.stringify({ success: true, slack_sent: true, count: patients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notify-slack-block-cancellations] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
