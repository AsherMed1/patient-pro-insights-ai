// Admin-only diagnostic: shows exactly how "Insurance Intake Source" resolves
// for a GHL contact — which project row matched, which HTTP calls succeeded,
// which custom field keys the contact carries, and the normalized result.
// Never returns API keys or tokens.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

const normalizeName = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

function extractInsuranceIntakeSource(fields: Array<{ key: string; value: any }>) {
  const matchesKey = (k: string) => /insurance[\s_-]*intake[\s_-]*source/i.test(k || '');
  const f = fields.find((x) => matchesKey(x?.key));
  if (!f) return { matchedKey: null, rawValue: null, normalized: null };
  const raw = f.value;
  const s = String(Array.isArray(raw) ? raw[0] : raw ?? '').toLowerCase().trim();
  let normalized: string | null = null;
  if (s.includes('trainee')) normalized = 'trainee_submitted';
  else if (s.includes('setter')) normalized = 'setter_submitted';
  else if (s.includes('patient')) normalized = 'patient_submitted';
  return { matchedKey: f.key, rawValue: raw ?? null, normalized };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ---- auth: caller must be an authenticated admin/agent ----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const diagKey = Deno.env.get('DIAGNOSTIC_KEY');
    const viaDiagKey = !!diagKey && req.headers.get('x-diagnostic-key') === diagKey;
    if (!viaDiagKey && token !== serviceKey) {
      if (!token) return json({ error: 'Unauthorized' }, 401);
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
      const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id);
      const allowed = (roles || []).some((r: any) => ['admin', 'agent', 'trainer'].includes(r.role));
      if (!allowed) return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    let contactId: string | null = body?.contact_id ?? null;
    let projectName: string | null = body?.project_name ?? null;
    let locationId: string | null = body?.location_id ?? null;

    if (!contactId && body?.appointment_id) {
      const { data: appt } = await admin
        .from('all_appointments')
        .select('ghl_id, project_name, insurance_intake_source, review_stage, review_status')
        .eq('id', body.appointment_id)
        .maybeSingle();
      contactId = appt?.ghl_id ?? null;
      projectName = projectName || appt?.project_name || null;
    }
    if (!contactId) return json({ error: 'contact_id or appointment_id is required' }, 400);

    const trace: Record<string, unknown> = { contactId, projectName, locationId };

    // ---- project resolution (same strategies as the webhook handler) ----
    let project: any = null;
    let strategy: string | null = null;

    if (locationId) {
      const { data } = await admin.from('projects')
        .select('project_name, ghl_api_key, ghl_location_id').eq('ghl_location_id', locationId).maybeSingle();
      if (data?.ghl_api_key) { project = data; strategy = 'location_id'; }
    }
    if (!project && projectName) {
      const { data } = await admin.from('projects')
        .select('project_name, ghl_api_key, ghl_location_id').eq('project_name', projectName).maybeSingle();
      if (data?.ghl_api_key) { project = data; strategy = 'exact_name'; }
    }
    if (!project && projectName) {
      const { data: candidates } = await admin.from('projects')
        .select('project_name, ghl_api_key, ghl_location_id')
        .ilike('project_name', `%${projectName.split(/\s+/)[0] || ''}%`).limit(50);
      const hit = (candidates || []).find((p: any) => normalizeName(p.project_name) === normalizeName(projectName!) && p.ghl_api_key);
      if (hit) { project = hit; strategy = 'normalized_name'; }
    }

    trace.projectMatch = project ? { project_name: project.project_name, ghl_location_id: project.ghl_location_id, strategy } : null;
    if (!project?.ghl_api_key) return json({ ok: false, reason: 'no_ghl_credentials', trace });

    const headers = {
      'Authorization': `Bearer ${project.ghl_api_key}`,
      'Version': GHL_API_VERSION,
      'Content-Type': 'application/json',
    };

    // ---- custom field definitions ----
    const defsRes = await fetch(`${GHL_BASE_URL}/locations/${project.ghl_location_id}/customFields`, { method: 'GET', headers });
    const defsMap: Record<string, string> = {};
    let defsBodySnippet: string | null = null;
    if (defsRes.ok) {
      const defsData = await defsRes.json();
      for (const d of (defsData.customFields || [])) if (d?.id && d?.name) defsMap[d.id] = d.name;
    } else {
      defsBodySnippet = (await defsRes.text()).slice(0, 300);
    }
    trace.customFieldDefs = { status: defsRes.status, count: Object.keys(defsMap).length, error: defsBodySnippet };
    trace.intakeSourceFieldDefined = Object.values(defsMap).filter((n) => /insurance[\s_-]*intake[\s_-]*source/i.test(n));

    // ---- contact ----
    const contactRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, { method: 'GET', headers });
    if (!contactRes.ok) {
      trace.contact = { status: contactRes.status, error: (await contactRes.text()).slice(0, 300) };
      return json({ ok: false, reason: 'contact_fetch_failed', trace });
    }
    const contactData = await contactRes.json();
    const contact = contactData.contact ?? contactData;
    const rawFields = contact?.customFields || [];
    const normalized = rawFields.map((f: any) => ({
      key: defsMap[f.id] || f.key || f.name || `(unresolved:${f.id})`,
      value: f.field_value ?? f.value,
    }));

    trace.contact = {
      status: contactRes.status,
      fieldCount: rawFields.length,
      keys: normalized.map((f: any) => f.key),
    };

    const result = extractInsuranceIntakeSource(normalized);
    return json({ ok: true, result, trace });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
