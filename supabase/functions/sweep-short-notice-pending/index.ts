import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STD_OFFSETS: Record<string, [number, number]> = {
  'America/New_York': [-5, -4],
  'America/Chicago': [-6, -5],
  'America/Denver': [-7, -6],
  'America/Phoenix': [-7, -7],
  'America/Los_Angeles': [-8, -7],
  'America/Anchorage': [-9, -8],
  'Pacific/Honolulu': [-10, -10],
};

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function isUSDST(year: number, month: number, day: number): boolean {
  const marStart = nthWeekdayOfMonth(year, 3, 0, 2);
  const novEnd = nthWeekdayOfMonth(year, 11, 0, 1);
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;
  if (month === 3) return day >= marStart;
  return day < novEnd;
}

function localDatetimeToUTC(dateStr: string, timeStr: string | null, timezone: string): Date {
  const naive = `${dateStr}T${timeStr || '09:00:00'}`;
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const offsets = STD_OFFSETS[timezone] || STD_OFFSETS['America/Chicago'];
  const offsetHours = isUSDST(y, m, d) ? offsets[1] : offsets[0];
  return new Date(new Date(naive + 'Z').getTime() - offsetHours * 3600000);
}

function calculateBusinessHours(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0;
  let total = 0;
  const cursor = new Date(start.getTime());
  const HOUR = 3600000;
  while (cursor.getTime() < end.getTime()) {
    const nextHour = Math.min(cursor.getTime() + HOUR, end.getTime());
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) total += (nextHour - cursor.getTime()) / HOUR;
    cursor.setTime(nextHour);
  }
  return total;
}

const TERMINAL = ['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon', 'do not call', 'donotcall', 'rescheduled', 'won'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Pending Review records that still have a future appointment slot
    const { data: rows, error } = await supabase
      .from('all_appointments')
      .select('id, lead_name, lead_phone_number, project_name, calendar_name, date_of_appointment, requested_time, status, ghl_id, created_at, date_appointment_created, short_notice_auto_tagged_at')
      .eq('review_status', 'pending')
      .eq('review_stage', 'pending_review')
      .gte('date_of_appointment', today)
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .limit(1000);

    if (error) throw error;
    const candidates = (rows || []).filter((r: any) => {
      const s = (r.status || '').toLowerCase().trim();
      return r.date_of_appointment && !TERMINAL.some((t) => s.includes(t));
    });

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ scanned: 0, tagged: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const projectNames = Array.from(new Set(candidates.map((r: any) => r.project_name).filter(Boolean)));
    const { data: projects } = await supabase
      .from('projects')
      .select('project_name, short_notice_threshold_hours, timezone, ghl_location_id')
      .in('project_name', projectNames);
    const projectMap: Record<string, any> = {};
    (projects || []).forEach((p: any) => { projectMap[p.project_name] = p; });

    // Skip anything that already has an open alert
    const { data: openAlerts } = await supabase
      .from('short_notice_alerts')
      .select('appointment_id')
      .in('appointment_id', candidates.map((r: any) => r.id))
      .is('resolved_at', null);
    const alreadyTagged = new Set((openAlerts || []).map((a: any) => a.appointment_id));

    let tagged = 0;
    for (const row of candidates) {
      if (alreadyTagged.has(row.id)) continue;
      const project = projectMap[row.project_name] || {};
      const threshold = project.short_notice_threshold_hours ?? 72;
      if (!threshold || threshold <= 0) continue;
      const timezone = project.timezone || 'America/Chicago';
      const apptUtc = localDatetimeToUTC(row.date_of_appointment.slice(0, 10), row.requested_time, timezone);
      if (apptUtc.getTime() <= now.getTime()) continue;
      const hoursOfNotice = calculateBusinessHours(now, apptUtc);
      if (hoursOfNotice > threshold) continue;

      console.log(`[sweep-short-notice-pending] Tagging ${row.lead_name} (${row.project_name}) — ${hoursOfNotice.toFixed(1)}h notice vs ${threshold}h threshold`);

      await supabase.functions.invoke('notify-slack-short-notice', {
        body: {
          appointmentId: row.id,
          projectName: row.project_name,
          leadName: row.lead_name,
          ghlId: row.ghl_id || null,
          ghlLocationId: project.ghl_location_id || null,
          appointmentDatetime: apptUtc.toISOString(),
          createdDatetime: new Date(row.created_at || row.date_appointment_created || now).toISOString(),
          hoursDifference: hoursOfNotice,
          status: row.status || 'Pending Review',
          calendarName: row.calendar_name || null,
          phone: row.lead_phone_number || null,
          timezone,
        },
      });

      await supabase
        .from('all_appointments')
        .update({ short_notice_auto_tagged_at: now.toISOString() })
        .eq('id', row.id);

      await supabase.from('appointment_review_history').insert({
        appointment_id: row.id,
        action: 'short_notice_auto_tagged',
        prior_status: 'pending',
        actor_id: null,
        actor_name: 'System',
        notes: `Entered the clinic short-notice window (${Math.round(hoursOfNotice)} business hours notice, threshold ${threshold}h) while in Pending Review.`,
      });

      await supabase.from('appointment_notes').insert({
        appointment_id: row.id,
        note_text: `Short Notice automatically applied — appointment is now within the clinic's ${threshold}h notice window (${Math.round(hoursOfNotice)}h remaining). Action required. - [[timestamp:${now.toISOString()}]]`,
        created_by: 'System',
        attachments: [],
      });

      tagged++;
    }

    return new Response(JSON.stringify({ scanned: candidates.length, tagged }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[sweep-short-notice-pending] error', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
