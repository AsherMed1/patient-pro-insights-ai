/**
 * audit-time-block-cancellations
 *
 * Identifies appointments silently cancelled in GHL by clinic time-block
 * creation but whose cancellation never made it back to the portal.
 *
 * Two detection signatures:
 *   A. Suppressed-webhook signature: security_audit_log rows where
 *      old_status === new_status (the Welcome Call sync bug).
 *   B. Time-block overlap signature: appointments with was_ever_confirmed=true
 *      whose date overlaps a reserved-block row in the same project + calendar,
 *      where the block was created in a known incident window.
 *
 * Optionally ground-truth-checked against GHL (parallel, capped).
 *
 * Modes:
 *   POST {check_ghl:false}        → fast path, no GHL HTTP. <5s typical.
 *   POST {check_ghl:true}         → adds parallel GHL verification.
 *   POST {format:'csv'}           → CSV download.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_INCIDENT_START = '2026-04-13T00:00:00Z';
const DEFAULT_INCIDENT_END = '2026-04-24T00:00:00Z';
const GHL_CONCURRENCY = 8;
const GHL_REQ_TIMEOUT_MS = 8000;
const GHL_MAX_CHECKS = 500;

interface SuspectRow {
  id: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string | null;
  status: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  calendar_name: string | null;
  ghl_appointment_id: string | null;
  ghl_id: string | null;
  was_ever_confirmed: boolean | null;
  updated_at: string;
  signatures: string[];
  suppressed_webhook_hits: number;
  block_overlap_id: string | null;
  ghl_status?: string | null;
  ghl_check_error?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Candidate fetch (one query, paginated to bypass the 1000-row default cap)
// ────────────────────────────────────────────────────────────────────────────
async function fetchAllCandidates(
  supabase: ReturnType<typeof createClient>,
  filters: { project_name?: string; since?: string }
): Promise<any[]> {
  const PAGE = 1000;
  const all: any[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from('all_appointments')
      .select('id, project_name, lead_name, lead_phone_number, status, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, ghl_id, was_ever_confirmed, updated_at, is_reserved_block, is_superseded')
      .in('status', ['Welcome Call', 'Confirmed', 'Scheduled', 'Pending'])
      .eq('was_ever_confirmed', true)
      .eq('is_superseded', false)
      .eq('is_reserved_block', false)
      .range(from, from + PAGE - 1);
    if (filters.project_name) q = q.eq('project_name', filters.project_name);
    if (filters.since) q = q.gte('updated_at', filters.since);
    const { data, error } = await q;
    if (error) throw new Error(`candidate fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ────────────────────────────────────────────────────────────────────────────
// Signature A — chunked lookup keyed by candidate appointment_id
// ────────────────────────────────────────────────────────────────────────────
async function findSignatureA(
  supabase: ReturnType<typeof createClient>,
  candidates: any[],
  windowStart: string
): Promise<Map<string, { row: any; hits: number }>> {
  const out = new Map<string, { row: any; hits: number }>();
  if (candidates.length === 0) return out;

  const candById = new Map(candidates.map((c) => [c.id, c]));
  const ids = Array.from(candById.keys());
  const CHUNK = 200;
  const hitsById = new Map<string, number>();

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    // PostgREST: filter the JSONB key directly. Pull up to 5000 rows per chunk.
    const { data, error } = await supabase
      .from('security_audit_log')
      .select('details')
      .eq('event_type', 'appointment_auto_completed')
      .gte('created_at', windowStart)
      .in('details->>appointment_id', slice)
      .limit(5000);
    if (error) throw new Error(`audit-log fetch chunk ${i}: ${error.message}`);
    for (const e of (data || []) as any[]) {
      const d = e.details || {};
      if (!d.appointment_id || !d.old_status || !d.new_status) continue;
      if (String(d.old_status).toLowerCase() !== String(d.new_status).toLowerCase()) continue;
      hitsById.set(d.appointment_id, (hitsById.get(d.appointment_id) || 0) + 1);
    }
  }

  for (const [apptId, hits] of hitsById.entries()) {
    if (hits < 2) continue;
    const cand = candById.get(apptId);
    if (!cand) continue;
    out.set(apptId, { row: cand, hits });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Signature B — pull blocks once, group candidates by (project,cal,date) in mem
// ────────────────────────────────────────────────────────────────────────────
async function findSignatureB(
  supabase: ReturnType<typeof createClient>,
  candidates: any[],
  filters: { project_name?: string; incident_start: string; incident_end: string }
): Promise<Map<string, { row: any; block_id: string }>> {
  const out = new Map<string, { row: any; block_id: string }>();

  let blocksQ = supabase
    .from('all_appointments')
    .select('id, project_name, calendar_name, date_of_appointment, created_at')
    .eq('is_reserved_block', true)
    .gte('created_at', filters.incident_start)
    .lte('created_at', filters.incident_end);
  if (filters.project_name) blocksQ = blocksQ.eq('project_name', filters.project_name);
  const { data: blocks, error } = await blocksQ;
  if (error) throw new Error(`blocks fetch: ${error.message}`);
  if (!blocks || blocks.length === 0) return out;

  // Index candidates by composite key
  const candIndex = new Map<string, any[]>();
  for (const c of candidates) {
    if (!c.date_of_appointment || !c.calendar_name) continue;
    const key = `${c.project_name}|||${c.calendar_name}|||${c.date_of_appointment}`;
    const arr = candIndex.get(key) || [];
    arr.push(c);
    candIndex.set(key, arr);
  }

  for (const block of blocks as any[]) {
    if (!block.date_of_appointment || !block.calendar_name) continue;
    const key = `${block.project_name}|||${block.calendar_name}|||${block.date_of_appointment}`;
    const matches = candIndex.get(key);
    if (!matches) continue;
    for (const m of matches) {
      if (!out.has(m.id)) out.set(m.id, { row: m, block_id: block.id });
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// GHL ground-truth check — parallel pool with per-request timeout
// ────────────────────────────────────────────────────────────────────────────
async function checkGhlStatus(
  supabase: ReturnType<typeof createClient>,
  suspects: SuspectRow[]
): Promise<{ checked: number; truncated: boolean }> {
  const credCache = new Map<string, string | null>();
  const subset = suspects.slice(0, GHL_MAX_CHECKS);
  const truncated = suspects.length > GHL_MAX_CHECKS;

  // Pre-load project credentials in one query
  const projectNames = Array.from(new Set(subset.map((s) => s.project_name)));
  if (projectNames.length) {
    const { data: projects } = await supabase
      .from('projects')
      .select('project_name, ghl_api_key')
      .in('project_name', projectNames);
    for (const p of (projects || []) as any[]) {
      credCache.set(p.project_name, p.ghl_api_key || null);
    }
  }

  let cursor = 0;
  const worker = async () => {
    while (cursor < subset.length) {
      const i = cursor++;
      const s = subset[i];
      if (!s.ghl_appointment_id) {
        s.ghl_status = null;
        s.ghl_check_error = 'no ghl_appointment_id';
        continue;
      }
      const apiKey = credCache.get(s.project_name);
      if (!apiKey) {
        s.ghl_check_error = 'no GHL API key for project';
        continue;
      }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), GHL_REQ_TIMEOUT_MS);
      try {
        const r = await fetch(
          `https://services.leadconnectorhq.com/calendars/events/appointments/${s.ghl_appointment_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Version': '2021-04-15',
              'Accept': 'application/json',
            },
            signal: ctrl.signal,
          }
        );
        if (r.status === 404) {
          s.ghl_status = 'deleted';
        } else if (!r.ok) {
          s.ghl_check_error = `GHL HTTP ${r.status}`;
          await r.body?.cancel();
        } else {
          const j = await r.json();
          s.ghl_status = j?.appointment?.appointmentStatus || null;
        }
      } catch (e) {
        s.ghl_check_error = e instanceof Error ? e.message : String(e);
      } finally {
        clearTimeout(t);
      }
    }
  };
  await Promise.all(Array.from({ length: GHL_CONCURRENCY }, worker));
  return { checked: subset.length, truncated };
}

function toCsv(rows: SuspectRow[]): string {
  const headers = [
    'id', 'project_name', 'lead_name', 'lead_phone_number',
    'date_of_appointment', 'requested_time', 'calendar_name',
    'portal_status', 'ghl_status', 'ghl_check_error',
    'signatures', 'suppressed_webhook_hits', 'block_overlap_id',
    'ghl_appointment_id', 'ghl_contact_id', 'updated_at',
  ];
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.id, r.project_name, r.lead_name, r.lead_phone_number,
      r.date_of_appointment, r.requested_time, r.calendar_name,
      r.status, r.ghl_status, r.ghl_check_error,
      r.signatures.join('|'), r.suppressed_webhook_hits, r.block_overlap_id,
      r.ghl_appointment_id, r.ghl_id, r.updated_at,
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let phase = 'init';
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let project_name: string | undefined;
    let since: string | undefined;
    let check_ghl = false;
    let format: 'json' | 'csv' = 'json';
    let incident_start = DEFAULT_INCIDENT_START;
    let incident_end = DEFAULT_INCIDENT_END;
    let only_signature: 'A' | 'B' | 'both' = 'both';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      project_name = body.project_name || undefined;
      since = body.since;
      check_ghl = body.check_ghl === true;
      format = body.format === 'csv' ? 'csv' : 'json';
      incident_start = body.incident_start || incident_start;
      incident_end = body.incident_end || incident_end;
      only_signature = body.only_signature || 'both';
    } else {
      const url = new URL(req.url);
      project_name = url.searchParams.get('project_name') || undefined;
      since = url.searchParams.get('since') || undefined;
      check_ghl = url.searchParams.get('check_ghl') === 'true';
      format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';
      incident_start = url.searchParams.get('incident_start') || incident_start;
      incident_end = url.searchParams.get('incident_end') || incident_end;
      only_signature = (url.searchParams.get('only_signature') as any) || 'both';
    }

    // CSV export always implies GHL check
    if (format === 'csv') check_ghl = true;

    console.log('[audit] start project=', project_name, 'since=', since, 'sig=', only_signature, 'check_ghl=', check_ghl);

    phase = 'candidates';
    const t0 = Date.now();
    const candidates = await fetchAllCandidates(supabase, { project_name, since });
    console.log(`[audit] phase=candidates ${candidates.length} rows in ${Date.now() - t0}ms`);

    phase = 'sigA';
    const tA = Date.now();
    const sigA = only_signature === 'B'
      ? new Map<string, { row: any; hits: number }>()
      : await findSignatureA(supabase, candidates, incident_start);
    console.log(`[audit] phase=sigA ${sigA.size} matches in ${Date.now() - tA}ms`);

    phase = 'sigB';
    const tB = Date.now();
    const sigB = only_signature === 'A'
      ? new Map<string, { row: any; block_id: string }>()
      : await findSignatureB(supabase, candidates, { project_name, incident_start, incident_end });
    console.log(`[audit] phase=sigB ${sigB.size} matches in ${Date.now() - tB}ms`);

    phase = 'merge';
    const merged = new Map<string, SuspectRow>();
    for (const [id, { row, hits }] of sigA.entries()) {
      merged.set(id, {
        id: row.id, project_name: row.project_name, lead_name: row.lead_name,
        lead_phone_number: row.lead_phone_number, status: row.status,
        date_of_appointment: row.date_of_appointment, requested_time: row.requested_time,
        calendar_name: row.calendar_name, ghl_appointment_id: row.ghl_appointment_id,
        ghl_id: row.ghl_id, was_ever_confirmed: row.was_ever_confirmed,
        updated_at: row.updated_at, signatures: ['A'], suppressed_webhook_hits: hits,
        block_overlap_id: null,
      });
    }
    for (const [id, { row, block_id }] of sigB.entries()) {
      const existing = merged.get(id);
      if (existing) {
        existing.signatures.push('B');
        existing.block_overlap_id = block_id;
      } else {
        merged.set(id, {
          id: row.id, project_name: row.project_name, lead_name: row.lead_name,
          lead_phone_number: row.lead_phone_number, status: row.status,
          date_of_appointment: row.date_of_appointment, requested_time: row.requested_time,
          calendar_name: row.calendar_name, ghl_appointment_id: row.ghl_appointment_id,
          ghl_id: row.ghl_id, was_ever_confirmed: row.was_ever_confirmed,
          updated_at: row.updated_at, signatures: ['B'], suppressed_webhook_hits: 0,
          block_overlap_id: block_id,
        });
      }
    }

    const suspects = Array.from(merged.values());
    let truncated = false;
    let ghl_checked = 0;

    if (check_ghl && suspects.length > 0) {
      phase = 'ghl';
      const tG = Date.now();
      const r = await checkGhlStatus(supabase, suspects);
      ghl_checked = r.checked;
      truncated = r.truncated;
      console.log(`[audit] phase=ghl checked=${r.checked} truncated=${r.truncated} in ${Date.now() - tG}ms`);
    }

    phase = 'aggregate';
    const byProject: Record<string, { suspect: number; ghl_cancelled: number; ghl_deleted: number }> = {};
    for (const s of suspects) {
      if (!byProject[s.project_name]) byProject[s.project_name] = { suspect: 0, ghl_cancelled: 0, ghl_deleted: 0 };
      byProject[s.project_name].suspect++;
      const g = (s.ghl_status || '').toLowerCase();
      if (g === 'cancelled' || g === 'canceled') byProject[s.project_name].ghl_cancelled++;
      if (g === 'deleted') byProject[s.project_name].ghl_deleted++;
    }

    if (format === 'csv') {
      return new Response(toCsv(suspects), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="block-incident-audit-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_suspects: suspects.length,
        signature_a_count: sigA.size,
        signature_b_count: sigB.size,
        ghl_checked,
        ghl_truncated: truncated,
        per_project: byProject,
        suspects,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[audit] fatal in phase=${phase}:`, error);
    // Return 200 with success:false so the client surfaces the real error
    return new Response(
      JSON.stringify({
        success: false,
        phase,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
