/**
 * audit-time-block-cancellations
 *
 * Identifies appointments that were silently cancelled in GoHighLevel by clinic
 * time-block creation, but whose cancellation never made it back to the portal.
 *
 * Two detection signatures are unioned:
 *   A. Suppressed-webhook signature: security_audit_log rows where
 *      old_status === new_status (the Welcome Call sync bug).
 *   B. Time-block overlap signature: appointments with was_ever_confirmed=true
 *      whose date/time overlaps a reserved-block row in the same project +
 *      calendar, where the block was created in a known incident window.
 *
 * Then ground-truth-checked against GHL: only rows where GHL reports
 * `cancelled` are returned as confirmed victims.
 *
 * Modes:
 *   GET/POST mode=audit         → read-only. Returns the suspect list + counts.
 *   GET/POST mode=audit&format=csv → CSV download.
 *
 * (Reconciliation moved to `restore-block-incident-appointments`.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default incident window — bulk time-block sweeps that triggered the issue
const DEFAULT_INCIDENT_START = '2026-04-13T00:00:00Z';
const DEFAULT_INCIDENT_END = '2026-04-24T00:00:00Z';

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
  signatures: string[]; // e.g. ['A', 'B']
  suppressed_webhook_hits: number;
  block_overlap_id: string | null;
  ghl_status?: string | null;
  ghl_check_error?: string | null;
}

async function findSignatureA(
  supabase: ReturnType<typeof createClient>,
  filters: { project_name?: string; since?: string }
): Promise<Map<string, { row: any; hits: number }>> {
  // Candidates still in active-tier portal status with was_ever_confirmed=true
  let query = supabase
    .from('all_appointments')
    .select('id, project_name, lead_name, lead_phone_number, status, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, ghl_id, was_ever_confirmed, updated_at, is_reserved_block, is_superseded')
    .in('status', ['Welcome Call', 'Confirmed', 'Scheduled', 'Pending'])
    .eq('was_ever_confirmed', true)
    .eq('is_superseded', false)
    .eq('is_reserved_block', false);

  if (filters.project_name) query = query.eq('project_name', filters.project_name);
  if (filters.since) query = query.gte('updated_at', filters.since);

  const { data: candidates } = await query;
  const out = new Map<string, { row: any; hits: number }>();
  if (!candidates) return out;

  for (const row of candidates as any[]) {
    const updatedAt = new Date(row.updated_at);
    const winStart = new Date(updatedAt.getTime() - 5 * 60_000).toISOString();
    const winEnd = new Date(updatedAt.getTime() + 5 * 60_000).toISOString();

    const { data: hits } = await supabase
      .from('security_audit_log')
      .select('id, details')
      .eq('event_type', 'appointment_auto_completed')
      .gte('created_at', winStart)
      .lte('created_at', winEnd);

    const matching = (hits || []).filter((h: any) => {
      const d = h.details || {};
      return (
        d.appointment_id === row.id &&
        d.old_status === d.new_status &&
        (d.old_status || '').toLowerCase() === (row.status || '').toLowerCase()
      );
    });

    if (matching.length >= 2) {
      out.set(row.id, { row, hits: matching.length });
    }
  }
  return out;
}

async function findSignatureB(
  supabase: ReturnType<typeof createClient>,
  filters: { project_name?: string; incident_start: string; incident_end: string }
): Promise<Map<string, { row: any; block_id: string }>> {
  // Step 1: pull all reserved blocks created during the incident window
  let blocksQ = supabase
    .from('all_appointments')
    .select('id, project_name, calendar_name, date_of_appointment, requested_time, created_at')
    .eq('is_reserved_block', true)
    .gte('created_at', filters.incident_start)
    .lte('created_at', filters.incident_end);
  if (filters.project_name) blocksQ = blocksQ.eq('project_name', filters.project_name);

  const { data: blocks } = await blocksQ;
  const out = new Map<string, { row: any; block_id: string }>();
  if (!blocks || blocks.length === 0) return out;

  // Step 2: for each block, find confirmed-tier appointments on the same
  // project + calendar + date.
  for (const block of blocks as any[]) {
    if (!block.date_of_appointment || !block.calendar_name) continue;

    let apptQ = supabase
      .from('all_appointments')
      .select('id, project_name, lead_name, lead_phone_number, status, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, ghl_id, was_ever_confirmed, updated_at')
      .eq('project_name', block.project_name)
      .eq('calendar_name', block.calendar_name)
      .eq('date_of_appointment', block.date_of_appointment)
      .eq('was_ever_confirmed', true)
      .eq('is_reserved_block', false)
      .eq('is_superseded', false)
      .in('status', ['Welcome Call', 'Confirmed', 'Scheduled', 'Pending']);

    const { data: appts } = await apptQ;
    if (!appts) continue;

    for (const appt of appts as any[]) {
      if (!out.has(appt.id)) {
        out.set(appt.id, { row: appt, block_id: block.id });
      }
    }
  }
  return out;
}

async function checkGhlStatus(
  supabase: ReturnType<typeof createClient>,
  suspects: SuspectRow[]
): Promise<void> {
  const credCache = new Map<string, { apiKey: string | null }>();

  for (const s of suspects) {
    if (!s.ghl_appointment_id) {
      s.ghl_status = null;
      s.ghl_check_error = 'no ghl_appointment_id';
      continue;
    }

    let cred = credCache.get(s.project_name);
    if (!cred) {
      const { data: project } = await supabase
        .from('projects')
        .select('ghl_api_key')
        .eq('project_name', s.project_name)
        .single();
      cred = { apiKey: (project as any)?.ghl_api_key || null };
      credCache.set(s.project_name, cred);
    }

    if (!cred.apiKey) {
      s.ghl_check_error = 'no GHL API key for project';
      continue;
    }

    try {
      const r = await fetch(
        `https://services.leadconnectorhq.com/calendars/events/appointments/${s.ghl_appointment_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cred.apiKey}`,
            'Version': '2021-04-15',
            'Accept': 'application/json',
          },
        }
      );
      if (r.status === 404) {
        s.ghl_status = 'deleted';
        continue;
      }
      if (!r.ok) {
        s.ghl_check_error = `GHL HTTP ${r.status}`;
        continue;
      }
      const j = await r.json();
      s.ghl_status = j?.appointment?.appointmentStatus || null;
    } catch (e) {
      s.ghl_check_error = e instanceof Error ? e.message : String(e);
    }
  }
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let project_name: string | undefined;
    let since: string | undefined;
    let check_ghl = true;
    let format: 'json' | 'csv' = 'json';
    let incident_start = DEFAULT_INCIDENT_START;
    let incident_end = DEFAULT_INCIDENT_END;
    let only_signature: 'A' | 'B' | 'both' = 'both';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      project_name = body.project_name;
      since = body.since;
      check_ghl = body.check_ghl !== false;
      format = body.format === 'csv' ? 'csv' : 'json';
      incident_start = body.incident_start || incident_start;
      incident_end = body.incident_end || incident_end;
      only_signature = body.only_signature || 'both';
    } else {
      const url = new URL(req.url);
      project_name = url.searchParams.get('project_name') || undefined;
      since = url.searchParams.get('since') || undefined;
      check_ghl = url.searchParams.get('check_ghl') !== 'false';
      format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';
      incident_start = url.searchParams.get('incident_start') || incident_start;
      incident_end = url.searchParams.get('incident_end') || incident_end;
      only_signature = (url.searchParams.get('only_signature') as any) || 'both';
    }

    console.log('[audit] project=', project_name, 'since=', since, 'sig=', only_signature);

    const sigA = only_signature === 'B' ? new Map() : await findSignatureA(supabase, { project_name, since });
    const sigB = only_signature === 'A' ? new Map() : await findSignatureB(supabase, { project_name, incident_start, incident_end });

    // Union by appointment id
    const merged = new Map<string, SuspectRow>();
    for (const [id, { row, hits }] of sigA.entries()) {
      merged.set(id, {
        id: row.id,
        project_name: row.project_name,
        lead_name: row.lead_name,
        lead_phone_number: row.lead_phone_number,
        status: row.status,
        date_of_appointment: row.date_of_appointment,
        requested_time: row.requested_time,
        calendar_name: row.calendar_name,
        ghl_appointment_id: row.ghl_appointment_id,
        ghl_id: row.ghl_id,
        was_ever_confirmed: row.was_ever_confirmed,
        updated_at: row.updated_at,
        signatures: ['A'],
        suppressed_webhook_hits: hits,
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
          id: row.id,
          project_name: row.project_name,
          lead_name: row.lead_name,
          lead_phone_number: row.lead_phone_number,
          status: row.status,
          date_of_appointment: row.date_of_appointment,
          requested_time: row.requested_time,
          calendar_name: row.calendar_name,
          ghl_appointment_id: row.ghl_appointment_id,
          ghl_id: row.ghl_id,
          was_ever_confirmed: row.was_ever_confirmed,
          updated_at: row.updated_at,
          signatures: ['B'],
          suppressed_webhook_hits: 0,
          block_overlap_id: block_id,
        });
      }
    }

    const suspects = Array.from(merged.values());
    console.log('[audit] suspects:', suspects.length, '(A:', sigA.size, 'B:', sigB.size, ')');

    if (check_ghl) {
      await checkGhlStatus(supabase, suspects);
    }

    // Per-project counts
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
        per_project: byProject,
        suspects,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[audit] fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
