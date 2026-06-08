import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

const REVIEW_QUEUE_EXEMPT = new Set([
  'ECCO Medical',
  'Premier Vascular',
  'Premier Vascular Surgery',
  'Davis Vein & Vascular',
]);

// Infer procedure from calendar/intake/project default so unscheduled-capture
// leads (ECCO/Premier/Davis) populate the service filter correctly at insert time.
function inferProcedureFromContext(
  projectName: string | null | undefined,
  calendarName: string | null | undefined,
  intakeNotes: string | null | undefined,
): string | null {
  const cal = (calendarName || '').toString();
  if (/\bGAE\b/i.test(cal)) return 'GAE';
  if (/\bUFE\b/i.test(cal)) return 'UFE';
  if (/\bPAE\b/i.test(cal)) return 'PAE';
  if (/\bPFE\b/i.test(cal)) return 'PFE';
  if (/\bHAE\b/i.test(cal)) return 'HAE';
  if (/\bTAE\b/i.test(cal)) return 'TAE';
  if (/\bPAD\b/i.test(cal)) return 'PAD';
  if (/neuropathy/i.test(cal)) return 'Neuropathy';
  if (/in[- ]?person/i.test(cal)) return 'GAE';
  if (/knee/i.test(cal)) return 'GAE';

  const notes = (intakeNotes || '').toString();
  if (/(knee pain|osteoarthritis|knee replacement)/i.test(notes)) return 'GAE';
  if (/(fibroid|uterine)/i.test(notes)) return 'UFE';
  if (/(prostate|\bBPH\b|enlarged prostate)/i.test(notes)) return 'PAE';
  if (/plantar fasciitis/i.test(notes)) return 'PFE';
  if (/hemorrhoid/i.test(notes)) return 'HAE';

  const proj = (projectName || '').trim().toLowerCase();
  if (proj === 'premier vascular' || proj === 'premier vascular surgery') return 'GAE';

  return null;
}


type InputRow = {
  project_name: string;
  ghl_contact_id: string;
  fallback_name?: string;
  fallback_phone?: string;
  fallback_email?: string;
};

type ResultRow = {
  project_name: string;
  ghl_contact_id: string;
  status: 'created' | 'skipped_existing' | 'skipped_no_project' | 'skipped_no_api_key' | 'error';
  appointment_id?: string;
  most_recent_appointment_date?: string | null;
  lead_name?: string;
  error?: string;
};

async function ghlFetch(url: string, apiKey: string, locationId?: string) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': GHL_API_VERSION,
      'Content-Type': 'application/json',
      ...(locationId ? { 'LocationId': locationId } : {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep as text */ }
  return { ok: res.ok, status: res.status, json, text };
}

function formatCustomFieldsToText(fields: { key: string; value: any }[]): string {
  if (!fields.length) return '';
  let out = '=== GHL Contact Data ===\n\n';
  for (const f of fields) {
    if (!f.key) continue;
    const v = Array.isArray(f.value) ? f.value.join(', ')
      : typeof f.value === 'object' && f.value !== null ? JSON.stringify(f.value)
      : (f.value ?? 'Not provided');
    out += `  ${f.key}: ${v}\n`;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const rows: InputRow[] = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) {
      return new Response(JSON.stringify({ error: 'rows[] required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Cache project config per project_name
    const projectCache = new Map<string, { ghl_api_key: string | null; ghl_location_id: string | null; timezone: string | null } | null>();
    async function getProject(name: string) {
      if (projectCache.has(name)) return projectCache.get(name)!;
      const { data } = await supabase
        .from('projects')
        .select('ghl_api_key, ghl_location_id, timezone')
        .eq('project_name', name)
        .maybeSingle();
      projectCache.set(name, data ?? null);
      return data ?? null;
    }

    // Custom field definitions cache per location
    const cfDefsCache = new Map<string, Record<string, string>>();
    async function getCustomFieldDefs(locationId: string, apiKey: string) {
      if (cfDefsCache.has(locationId)) return cfDefsCache.get(locationId)!;
      const r = await ghlFetch(`${GHL_BASE_URL}/locations/${locationId}/customFields`, apiKey);
      const defs: Record<string, string> = {};
      if (r.ok && r.json?.customFields) {
        for (const d of r.json.customFields) {
          if (d.id && d.name) defs[d.id] = d.name;
        }
      }
      cfDefsCache.set(locationId, defs);
      return defs;
    }

    const results: ResultRow[] = [];

    for (const row of rows) {
      const result: ResultRow = {
        project_name: row.project_name,
        ghl_contact_id: row.ghl_contact_id,
        status: 'error',
      };
      try {
        const project = await getProject(row.project_name);
        if (!project) { result.status = 'skipped_no_project'; results.push(result); continue; }
        if (!project.ghl_api_key || !project.ghl_location_id) {
          result.status = 'skipped_no_api_key'; results.push(result); continue;
        }

        // Skip duplicates
        const { data: existing } = await supabase
          .from('all_appointments')
          .select('id, date_of_appointment')
          .eq('project_name', row.project_name)
          .eq('ghl_id', row.ghl_contact_id)
          .limit(1)
          .maybeSingle();
        if (existing) {
          result.status = 'skipped_existing';
          result.appointment_id = existing.id;
          results.push(result);
          continue;
        }

        // Fetch contact
        const contactRes = await ghlFetch(
          `${GHL_BASE_URL}/contacts/${row.ghl_contact_id}`,
          project.ghl_api_key,
          project.ghl_location_id,
        );
        if (!contactRes.ok) {
          result.error = `contact fetch ${contactRes.status}: ${contactRes.text.slice(0, 200)}`;
          results.push(result); continue;
        }
        const contact = contactRes.json?.contact ?? contactRes.json;
        if (!contact) { result.error = 'no contact body'; results.push(result); continue; }

        const cfDefs = await getCustomFieldDefs(project.ghl_location_id, project.ghl_api_key);
        const rawCfs = Array.isArray(contact.customFields) ? contact.customFields : [];
        const customFields = rawCfs.map((f: any) => ({
          key: cfDefs[f.id] || f.key || `Unknown (${f.id})`,
          value: f.field_value ?? f.value,
        })).filter((f: any) => f.value !== undefined && f.value !== null && f.value !== '');
        const formattedNotes = formatCustomFieldsToText(customFields);

        // Fetch contact appointments — pick most recent by startTime
        let mostRecent: any = null;
        const apptRes = await ghlFetch(
          `${GHL_BASE_URL}/contacts/${row.ghl_contact_id}/appointments`,
          project.ghl_api_key,
          project.ghl_location_id,
        );
        if (apptRes.ok) {
          const events = apptRes.json?.events || apptRes.json?.appointments || apptRes.json || [];
          const list = Array.isArray(events) ? events : [];
          list.sort((a: any, b: any) => {
            const ta = new Date(a.startTime || a.start_time || 0).getTime();
            const tb = new Date(b.startTime || b.start_time || 0).getTime();
            return tb - ta;
          });
          mostRecent = list[0] || null;
        } else {
          console.warn(`appointments fetch ${apptRes.status} for ${row.ghl_contact_id}: ${apptRes.text.slice(0,120)}`);
        }

        // Build appointment date/time in project TZ
        const tz = project.timezone || 'America/Chicago';
        let dateOfAppt: string | null = null;
        let requestedTime: string | null = null;
        const rawStart: string | undefined = mostRecent?.startTime || mostRecent?.start_time;
        if (rawStart) {
          // GHL's contact-appointments endpoint returns startTime as a NAIVE local-time
          // string in the location's timezone (no offset, e.g. "2026-06-10T10:00:00").
          // Treat such strings as wall-clock time and use the date/time components verbatim
          // instead of parsing them through Date() (which would assume UTC and shift hours).
          const naiveMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(rawStart);
          if (naiveMatch) {
            dateOfAppt = naiveMatch[1];
            requestedTime = `${naiveMatch[2]}:${naiveMatch[3]}:${naiveMatch[4] || '00'}`;
          } else {
            // Has explicit offset / Z — parse as instant and convert into project TZ.
            const start = new Date(rawStart);
            if (!isNaN(start.getTime())) {
              dateOfAppt = new Intl.DateTimeFormat('en-CA', {
                timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
              }).format(start);
              requestedTime = new Intl.DateTimeFormat('en-GB', {
                timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
              }).format(start);
            }
          }
        }

        const leadName =
          contact.contactName ||
          [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
          row.fallback_name ||
          'Unknown';
        const leadPhone = contact.phone || row.fallback_phone || null;
        const leadEmail = contact.email || row.fallback_email || null;
        const dob = contact.dateOfBirth || contact.dob || null;

        const isExempt = REVIEW_QUEUE_EXEMPT.has(row.project_name);
        const reviewStatus = isExempt ? 'approved' : 'pending';
        const calendarName = mostRecent?.title || mostRecent?.calendarName || null;

        const inferredProcedure = inferProcedureFromContext(
          row.project_name,
          calendarName,
          formattedNotes,
        );

        const insertPayload: Record<string, any> = {
          project_name: row.project_name,
          lead_name: leadName,
          lead_phone_number: leadPhone,
          lead_email: leadEmail,
          dob: dob && /^\d{4}-\d{2}-\d{2}/.test(String(dob)) ? String(dob).slice(0, 10) : null,
          ghl_id: row.ghl_contact_id,
          ghl_appointment_id: mostRecent?.id || null,
          ghl_location_id: project.ghl_location_id,
          calendar_name: calendarName,
          date_of_appointment: dateOfAppt,
          requested_time: requestedTime,
          status: 'Confirmed',
          patient_intake_notes: formattedNotes || null,
          review_status: reviewStatus,
          internal_process_complete: false,
          date_appointment_created: new Date().toISOString().slice(0, 10),
          ...(inferredProcedure ? { parsed_pathology_info: { procedure: inferredProcedure } } : {}),
        };

        const { data: inserted, error: insErr } = await supabase
          .from('all_appointments')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insErr) {
          result.error = `insert: ${insErr.message}`;
          results.push(result);
          continue;
        }
        result.appointment_id = inserted!.id;

        result.status = 'created';
        result.most_recent_appointment_date = dateOfAppt;
        result.lead_name = leadName;
        results.push(result);
      } catch (e: any) {
        result.error = e?.message || String(e);
        results.push(result);
      }
    }

    const summary = {
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      skipped_existing: results.filter(r => r.status === 'skipped_existing').length,
      skipped_no_project: results.filter(r => r.status === 'skipped_no_project').length,
      skipped_no_api_key: results.filter(r => r.status === 'skipped_no_api_key').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
