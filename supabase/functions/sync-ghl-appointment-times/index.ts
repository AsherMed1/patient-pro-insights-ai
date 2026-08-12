// Reconciles portal appointment date/time/calendar against the live GoHighLevel event.
// Closes the gap where a GHL reschedule webhook is missed or swallowed and the portal keeps
// showing a stale slot (Reginald Wilson, Georgia Endovascular, Aug 2026).
//
// Modes:
//   { appointment_ids: [uuid, ...] }  — check specific rows (used by the Review Queue button)
//   { sweep: true, limit?: number }   — check pending-review + future booked rows (cron, every 15m)
//   { dry_run: true }                 — report drift without writing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { formatInTimeZone } from 'npm:date-fns-tz@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';

type Row = {
  id: string;
  lead_name: string | null;
  project_name: string | null;
  status: string | null;
  review_status: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  calendar_name: string | null;
  reschedule_history: any;
  ghl_appointment_id: string | null;
  is_unscheduled: boolean | null;
};

const normTime = (v: unknown) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s) return '';
  const p = s.split(':');
  return p.length < 2 ? s : `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const appointmentIds: string[] = Array.isArray(body?.appointment_ids) ? body.appointment_ids : [];
    const sweep = !!body?.sweep;
    const dryRun = !!body?.dry_run;
    const limit = Math.min(Number(body?.limit) || 200, 500);

    const cols =
      'id, lead_name, project_name, status, review_status, date_of_appointment, requested_time, calendar_name, reschedule_history, ghl_appointment_id, is_unscheduled';

    let rows: Row[] = [];
    if (appointmentIds.length) {
      const { data } = await supabase.from('all_appointments').select(cols).in('id', appointmentIds);
      rows = (data || []) as Row[];
    } else if (sweep) {
      const today = new Date().toISOString().slice(0, 10);
      // Everything still awaiting review, plus anything booked in the future.
      const { data } = await supabase
        .from('all_appointments')
        .select(cols)
        .eq('is_superseded', false)
        .neq('is_reserved_block', true)
        .not('ghl_appointment_id', 'is', null)
        .or(`review_status.eq.pending,date_of_appointment.gte.${today}`)
        .order('date_of_appointment', { ascending: true })
        .limit(limit);
      rows = (data || []) as Row[];
    } else {
      return new Response(JSON.stringify({ error: 'appointment_ids[] or sweep:true required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const projectCache = new Map<string, { apiKey: string | null; timezone: string }>();
    async function getProject(name: string) {
      if (projectCache.has(name)) return projectCache.get(name)!;
      const { data } = await supabase
        .from('projects')
        .select('ghl_api_key, timezone')
        .eq('project_name', name)
        .maybeSingle();
      const p = { apiKey: data?.ghl_api_key || null, timezone: data?.timezone || 'America/Chicago' };
      projectCache.set(name, p);
      return p;
    }

    const results: any[] = [];

    const processRow = async (row: Row) => {
      const out: any = {
        appointment_id: row.id,
        lead_name: row.lead_name,
        project_name: row.project_name,
        portal_date: row.date_of_appointment,
        portal_time: row.requested_time,
      };

      try {
        if (!row.project_name || !row.ghl_appointment_id || row.is_unscheduled) {
          out.check = 'skipped';
          results.push(out);
          return;
        }

        const { apiKey, timezone } = await getProject(row.project_name);
        if (!apiKey) {
          out.check = 'skipped_no_api_key';
          results.push(out);
          return;
        }

        const res = await fetch(
          `${GHL_BASE_URL}/calendars/events/appointments/${row.ghl_appointment_id}`,
          { headers: { Authorization: `Bearer ${apiKey}`, Version: GHL_API_VERSION, Accept: 'application/json' } },
        );
        const text = await res.text();
        if (!res.ok) {
          out.check = 'ghl_error';
          out.ghl_http_status = res.status;
          out.ghl_error = text.slice(0, 200);
          results.push(out);
          return;
        }

        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* raw */ }
        const ev = json?.appointment || json?.event || json;
        const startTime = ev?.startTime;
        if (!startTime) {
          out.check = 'ghl_no_start_time';
          results.push(out);
          return;
        }

        // GHL returns startTime as wall-clock time in the calendar's own timezone with an
        // explicit offset (e.g. "2026-08-18T13:00:00-04:00"). Read the wall clock straight from
        // the string — that is exactly what the GHL UI shows — and only fall back to converting
        // through the project's configured timezone when no offset is present.
        const wall = String(startTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})/);
        const hasLocalOffset = !!wall && wall[5] !== 'Z';
        const ghlDate = hasLocalOffset
          ? wall[1]
          : formatInTimeZone(new Date(startTime), timezone, 'yyyy-MM-dd');
        const ghlTime = hasLocalOffset
          ? `${wall[2]}:${wall[3]}:${wall[4] || '00'}`
          : formatInTimeZone(new Date(startTime), timezone, 'HH:mm:ss');
        out.ghl_date = ghlDate;
        out.ghl_time = ghlTime;
        out.ghl_status = ev?.appointmentStatus || null;


        const dateDiffers = String(row.date_of_appointment || '').slice(0, 10) !== ghlDate;
        const timeDiffers = normTime(row.requested_time) !== normTime(ghlTime);

        if (!dateDiffers && !timeDiffers) {
          out.check = 'in_sync';
          results.push(out);
          return;
        }

        out.check = 'drift';
        if (dryRun) {
          results.push(out);
          return;
        }

        const history = Array.isArray(row.reschedule_history) ? row.reschedule_history : [];
        history.push({
          previous_date: row.date_of_appointment,
          previous_time: row.requested_time,
          new_date: ghlDate,
          new_time: ghlTime,
          changed_at: new Date().toISOString(),
          previous_status: row.status,
          source: 'ghl_reconciliation_sweep',
        });

        const updates: Record<string, unknown> = {
          date_of_appointment: ghlDate,
          requested_time: ghlTime,
          reschedule_history: history,
          updated_at: new Date().toISOString(),
        };

        const { error: updErr } = await supabase.from('all_appointments').update(updates).eq('id', row.id);
        if (updErr) {
          out.check = 'update_failed';
          out.error = updErr.message;
          results.push(out);
          return;
        }

        out.check = 'corrected';

        const from = [row.date_of_appointment, row.requested_time].filter(Boolean).join(' ') || 'Unknown';
        await supabase.from('appointment_notes').insert({
          appointment_id: row.id,
          note_text: `Appointment date/time re-synced from GoHighLevel | FROM: ${from} | TO: ${ghlDate} ${ghlTime} — System`,
          created_by: 'System',
        });

        results.push(out);
      } catch (e: any) {
        out.check = 'error';
        out.error = e?.message || String(e);
        results.push(out);
      }
    };

    const CONCURRENCY = 8;
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      await Promise.all(rows.slice(i, i + CONCURRENCY).map(processRow));
    }

    const summary = {
      checked: results.length,
      in_sync: results.filter((r) => r.check === 'in_sync').length,
      drift: results.filter((r) => r.check === 'drift').length,
      corrected: results.filter((r) => r.check === 'corrected').length,
      ghl_error: results.filter((r) => r.check === 'ghl_error').length,
      skipped: results.filter((r) => String(r.check).startsWith('skipped')).length,
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
