// One-shot backfill: re-fetch GHL appointments for rows created by the
// import-missing-leads-from-ghl job and correct date_of_appointment/requested_time
// using the same naive-string-aware parsing now used in the import function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

async function ghlFetch(url: string, apiKey: string, locationId?: string) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': GHL_API_VERSION,
      'Content-Type': 'application/json',
      ...(locationId ? { 'LocationId': locationId } : {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, json, text };
}

function parseGhlStart(rawStart: string | null | undefined, tz: string) {
  if (!rawStart) return { dateOfAppt: null as string | null, requestedTime: null as string | null };
  const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(rawStart);
  if (naive) {
    return {
      dateOfAppt: naive[1],
      requestedTime: `${naive[2]}:${naive[3]}:${naive[4] || '00'}`,
    };
  }
  const d = new Date(rawStart);
  if (isNaN(d.getTime())) return { dateOfAppt: null, requestedTime: null };
  const dateOfAppt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const requestedTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d);
  return { dateOfAppt, requestedTime };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dry_run !== false; // default true
    const createdDate: string = body?.created_date || '2026-05-26';
    const onlyId: string | undefined = body?.appointment_id;

    let query = supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, ghl_appointment_id, date_of_appointment, requested_time')
      .not('ghl_appointment_id', 'is', null)
      .neq('is_reserved_block', true);

    if (onlyId) {
      query = query.eq('id', onlyId);
    } else {
      query = query
        .gte('created_at', `${createdDate}T00:00:00Z`)
        .lt('created_at', `${createdDate}T23:59:59Z`);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const projectCache = new Map<string, any>();
    async function getProject(name: string) {
      if (projectCache.has(name)) return projectCache.get(name);
      const { data } = await supabase
        .from('projects')
        .select('ghl_api_key, ghl_location_id, timezone')
        .eq('project_name', name)
        .maybeSingle();
      projectCache.set(name, data);
      return data;
    }

    const results: any[] = [];

    for (const row of rows || []) {
      try {
        const project = await getProject(row.project_name);
        if (!project?.ghl_api_key || !project?.ghl_location_id) {
          results.push({ id: row.id, lead_name: row.lead_name, status: 'skip_no_project_creds' });
          continue;
        }
        const apptRes = await ghlFetch(
          `${GHL_BASE_URL}/calendars/events/appointments/${row.ghl_appointment_id}`,
          project.ghl_api_key,
          project.ghl_location_id,
        );

        let rawStart: string | null = null;
        if (apptRes.ok) {
          const appt = apptRes.json?.appointment || apptRes.json?.event || apptRes.json;
          rawStart = appt?.startTime || appt?.start_time || null;
        }
        if (!rawStart) {
          results.push({ id: row.id, lead_name: row.lead_name, status: 'no_ghl_start', ghl_status: apptRes.status });
          continue;
        }

        const tz = project.timezone || 'America/Chicago';
        const { dateOfAppt, requestedTime } = parseGhlStart(rawStart, tz);
        if (!dateOfAppt || !requestedTime) {
          results.push({ id: row.id, lead_name: row.lead_name, status: 'unparseable', rawStart });
          continue;
        }

        const changed = dateOfAppt !== row.date_of_appointment || requestedTime !== row.requested_time;
        const entry: any = {
          id: row.id,
          lead_name: row.lead_name,
          project_name: row.project_name,
          tz,
          rawStart,
          before: { date: row.date_of_appointment, time: row.requested_time },
          after: { date: dateOfAppt, time: requestedTime },
          changed,
        };

        if (changed && !dryRun) {
          const { error: updErr } = await supabase
            .from('all_appointments')
            .update({ date_of_appointment: dateOfAppt, requested_time: requestedTime, updated_at: new Date().toISOString() })
            .eq('id', row.id);
          entry.updated = !updErr;
          if (updErr) entry.error = updErr.message;
        }
        results.push(entry);
      } catch (e) {
        results.push({ id: row.id, lead_name: row.lead_name, status: 'error', error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({
      dry_run: dryRun,
      total: rows?.length || 0,
      changed: results.filter(r => r.changed).length,
      results,
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
