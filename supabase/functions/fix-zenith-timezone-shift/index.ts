import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_NAME = 'Zenith Vascular & Fibroid Center';
const TIMEZONE = 'America/Chicago';
const SHIFT_HOURS = 1;

function shiftDateTime(dateStr: string, timeStr: string, hours: number) {
  // Treat as wall-clock; add hours, return {date, time} strings
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm, ss] = timeStr.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss || 0));
  dt.setUTCHours(dt.getUTCHours() + hours);
  const newDate = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const newTime = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}:${String(dt.getUTCSeconds()).padStart(2, '0')}`;
  return { newDate, newTime };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    let idsFilter: string[] | null = null;
    let shiftHours = SHIFT_HOURS;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.ids) && body.ids.length) idsFilter = body.ids;
      if (typeof body?.shiftHours === 'number') shiftHours = body.shiftHours;
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let q = supabase
      .from('all_appointments')
      .select('id, lead_name, date_of_appointment, requested_time, ghl_appointment_id, status')
      .eq('project_name', PROJECT_NAME)
      .not('status', 'in', '("Cancelled","No Show","Showed","Won","Do Not Call","Rescheduled","OON")')
      .gte('date_of_appointment', new Date().toISOString().slice(0, 10))
      .not('ghl_appointment_id', 'is', null);
    if (idsFilter) q = q.in('id', idsFilter);
    const { data: appts, error } = await q;

    if (error) throw error;

    const updated: any[] = [];
    const failed: any[] = [];
    const skipped: any[] = [];

    for (const a of appts || []) {
      if (!a.requested_time || !a.date_of_appointment) {
        skipped.push({ id: a.id, lead_name: a.lead_name, reason: 'missing date/time' });
        continue;
      }

      const { newDate, newTime } = shiftDateTime(
        a.date_of_appointment,
        a.requested_time,
        shiftHours
      );

      const record = {
        id: a.id,
        lead_name: a.lead_name,
        ghl_appointment_id: a.ghl_appointment_id,
        old: `${a.date_of_appointment} ${a.requested_time}`,
        new: `${newDate} ${newTime}`,
      };

      if (dryRun) {
        updated.push({ ...record, dryRun: true });
        continue;
      }

      // Call GHL update
      const ghlRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-ghl-appointment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ghl_appointment_id: a.ghl_appointment_id,
            new_date: newDate,
            new_time: newTime.slice(0, 5),
            timezone: TIMEZONE,
            project_name: PROJECT_NAME,
          }),
        }
      );

      const ghlBody = await ghlRes.json().catch(() => ({}));

      if (!ghlRes.ok) {
        failed.push({ ...record, ghl_status: ghlRes.status, ghl_error: ghlBody });
        continue;
      }

      // Update DB
      const { error: upErr } = await supabase
        .from('all_appointments')
        .update({
          date_of_appointment: newDate,
          requested_time: newTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', a.id);

      if (upErr) {
        failed.push({ ...record, db_error: upErr.message });
        continue;
      }

      // Audit note
      await supabase.from('appointment_notes').insert({
        appointment_id: a.id,
        note: `System: Time zone correction applied (+1h). Shifted from ${a.requested_time.slice(0, 5)} to ${newTime.slice(0, 5)} CT after GHL location time zone update.`,
      });

      updated.push(record);

      // Pace requests
      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        total: appts?.length || 0,
        updated_count: updated.length,
        failed_count: failed.length,
        skipped_count: skipped.length,
        updated,
        failed,
        skipped,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('fix-zenith-timezone-shift error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
