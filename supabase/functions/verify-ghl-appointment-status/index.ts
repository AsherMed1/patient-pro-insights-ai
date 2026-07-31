// Read-only GHL verification: compares the portal's stored status against the
// live GoHighLevel appointment status. Used to diagnose "cancelled in portal /
// still booked in GHL" mismatches. Performs NO writes to GHL or the portal.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

type Row = {
  id: string;
  lead_name: string | null;
  project_name: string | null;
  status: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  ghl_appointment_id: string | null;
  ghl_id: string | null;
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
    const sweep: boolean = !!body?.sweep;
    const limit: number = Math.min(Number(body?.limit) || 100, 300);

    let rows: Row[] = [];

    if (appointmentIds.length) {
      const { data } = await supabase
        .from('all_appointments')
        .select('id, lead_name, project_name, status, date_of_appointment, requested_time, ghl_appointment_id, ghl_id')
        .in('id', appointmentIds);
      rows = (data || []) as Row[];
    } else if (sweep) {
      // Candidates: portal says Cancelled, appointment still in the future,
      // and the row is live (not superseded / declined).
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('all_appointments')
        .select('id, lead_name, project_name, status, date_of_appointment, requested_time, ghl_appointment_id, ghl_id')
        .eq('status', 'Cancelled')
        .eq('is_superseded', false)
        .gte('date_of_appointment', today)
        .not('ghl_appointment_id', 'is', null)
        .order('date_of_appointment', { ascending: true })
        .limit(limit);
      rows = (data || []) as Row[];
    } else {
      return new Response(JSON.stringify({ error: 'appointment_ids[] or sweep:true required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyCache = new Map<string, string | null>();
    async function getKey(project: string) {
      if (keyCache.has(project)) return keyCache.get(project)!;
      const { data } = await supabase
        .from('projects')
        .select('ghl_api_key')
        .eq('project_name', project)
        .maybeSingle();
      const key = data?.ghl_api_key || null;
      keyCache.set(project, key);
      return key;
    }

    const results: any[] = [];
    for (const row of rows) {
      const out: any = {
        appointment_id: row.id,
        lead_name: row.lead_name,
        project_name: row.project_name,
        portal_status: row.status,
        date_of_appointment: row.date_of_appointment,
        ghl_appointment_id: row.ghl_appointment_id,
      };
      try {
        if (!row.project_name || !row.ghl_appointment_id) {
          out.check = 'skipped_missing_ids';
          results.push(out);
          continue;
        }
        const apiKey = await getKey(row.project_name);
        if (!apiKey) {
          out.check = 'skipped_no_api_key';
          results.push(out);
          continue;
        }

        const res = await fetch(
          `${GHL_BASE_URL}/calendars/events/appointments/${row.ghl_appointment_id}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Version: GHL_API_VERSION,
              Accept: 'application/json',
            },
          },
        );
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* raw */ }

        if (!res.ok) {
          out.check = 'ghl_error';
          out.ghl_http_status = res.status;
          out.ghl_error = text.slice(0, 200);
          results.push(out);
          continue;
        }

        const ev = json?.event || json?.appointment || json;
        const ghlStatus = String(ev?.appointmentStatus || ev?.status || '').toLowerCase().trim();
        out.ghl_status = ghlStatus || null;
        out.ghl_start_time = ev?.startTime || null;
        const ghlCancelled = ghlStatus === 'cancelled' || ghlStatus === 'canceled';
        out.check = ghlCancelled ? 'match_cancelled' : 'mismatch_still_booked';
        results.push(out);
      } catch (e: any) {
        out.check = 'error';
        out.error = e?.message || String(e);
        results.push(out);
      }
    }

    const summary = {
      checked: results.length,
      mismatch_still_booked: results.filter(r => r.check === 'mismatch_still_booked').length,
      match_cancelled: results.filter(r => r.check === 'match_cancelled').length,
      ghl_error: results.filter(r => r.check === 'ghl_error').length,
      skipped: results.filter(r => String(r.check).startsWith('skipped')).length,
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
