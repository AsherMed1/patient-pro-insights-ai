/**
 * audit-time-block-cancellations
 *
 * Identifies appointments that were silently cancelled in GoHighLevel by clinic
 * time-block creation, but whose cancellation never made it back to the portal
 * (because of the Welcome Call webhook-suppression bug, fixed 2026-04-23).
 *
 * Modes:
 *   GET  ?mode=audit              → read-only. Returns the list of suspect appointments,
 *                                   per-clinic counts, and (optionally) GHL's current
 *                                   appointmentStatus for each.
 *   POST { mode: 'reconcile' }    → for every appointment where GHL reports `cancelled`,
 *                                   updates the portal row to status='Cancelled' with
 *                                   cancellation_reason and an internal note explaining
 *                                   the backfill. Does NOT touch GHL.
 *
 * Both modes accept optional filters: project_name, since (ISO date).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuspectRow {
  id: string;
  project_name: string;
  lead_name: string;
  status: string | null;
  date_of_appointment: string | null;
  requested_time: string | null;
  calendar_name: string | null;
  ghl_appointment_id: string | null;
  was_ever_confirmed: boolean | null;
  updated_at: string;
  suppressed_webhook_hits: number;
  ghl_status?: string | null;
  ghl_check_error?: string | null;
}

async function findSuspects(
  supabase: ReturnType<typeof createClient>,
  filters: { project_name?: string; since?: string }
): Promise<SuspectRow[]> {
  // Pull candidate appointments still showing as confirmed-tier in the portal.
  let query = supabase
    .from('all_appointments')
    .select('id, project_name, lead_name, status, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, was_ever_confirmed, updated_at, is_reserved_block, is_superseded')
    .in('status', ['Welcome Call', 'Confirmed', 'Scheduled', 'Pending'])
    .eq('was_ever_confirmed', true)
    .eq('is_superseded', false)
    .eq('is_reserved_block', false);

  if (filters.project_name) query = query.eq('project_name', filters.project_name);
  if (filters.since) query = query.gte('updated_at', filters.since);

  const { data: candidates, error } = await query;
  if (error) {
    console.error('[audit] candidate query failed:', error);
    return [];
  }
  if (!candidates) return [];

  const suspects: SuspectRow[] = [];

  // For each candidate, count suppressed webhook hits (old_status === new_status writes
  // logged in security_audit_log within 5 minutes of the row's updated_at).
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
      suspects.push({
        id: row.id,
        project_name: row.project_name,
        lead_name: row.lead_name,
        status: row.status,
        date_of_appointment: row.date_of_appointment,
        requested_time: row.requested_time,
        calendar_name: row.calendar_name,
        ghl_appointment_id: row.ghl_appointment_id,
        was_ever_confirmed: row.was_ever_confirmed,
        updated_at: row.updated_at,
        suppressed_webhook_hits: matching.length,
      });
    }
  }

  return suspects;
}

async function checkGhlStatus(
  supabase: ReturnType<typeof createClient>,
  suspects: SuspectRow[]
): Promise<void> {
  // Cache project credentials so we don't refetch per row
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

async function reconcile(
  supabase: ReturnType<typeof createClient>,
  suspects: SuspectRow[]
): Promise<{ updated: number; skipped: number; errors: number }> {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const s of suspects) {
    const ghl = (s.ghl_status || '').toLowerCase();
    if (ghl !== 'cancelled' && ghl !== 'canceled') {
      skipped++;
      continue;
    }

    try {
      // Mirror GHL state into the portal
      const { error: updErr } = await supabase
        .from('all_appointments')
        .update({
          status: 'Cancelled',
          cancellation_reason:
            'Auto-cancelled by GoHighLevel — clinic time block was created over this slot. Original webhook was suppressed by a now-fixed bug. Patient should be rebooked.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', s.id);

      if (updErr) {
        console.error('[audit/reconcile] update failed for', s.id, updErr);
        errors++;
        continue;
      }

      // Internal note for clinic visibility
      await supabase.from('appointment_notes').insert({
        appointment_id: s.id,
        note_text: `[Backfill — VIM time-block incident 2026-04-21] Status changed from "${s.status}" to "Cancelled". GoHighLevel silently cancelled this appointment when a clinic time block was created over the slot. The cancellation webhook was suppressed by the Welcome Call sync bug (fixed 2026-04-23). Please rebook this patient at a new time.`,
        created_by: null,
      });

      // Audit trail
      await supabase.from('security_audit_log').insert({
        event_type: 'time_block_cancellation_backfill',
        details: {
          appointment_id: s.id,
          lead_name: s.lead_name,
          project_name: s.project_name,
          old_status: s.status,
          new_status: 'Cancelled',
          ghl_status: s.ghl_status,
          suppressed_webhook_hits: s.suppressed_webhook_hits,
          timestamp: new Date().toISOString(),
        },
      });

      updated++;
    } catch (e) {
      console.error('[audit/reconcile] exception for', s.id, e);
      errors++;
    }
  }

  return { updated, skipped, errors };
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

    let mode = 'audit';
    let project_name: string | undefined;
    let since: string | undefined;
    let check_ghl = true;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      mode = body.mode || 'audit';
      project_name = body.project_name;
      since = body.since;
      check_ghl = body.check_ghl !== false;
    } else {
      const url = new URL(req.url);
      mode = url.searchParams.get('mode') || 'audit';
      project_name = url.searchParams.get('project_name') || undefined;
      since = url.searchParams.get('since') || undefined;
      check_ghl = url.searchParams.get('check_ghl') !== 'false';
    }

    console.log('[audit] mode=', mode, 'project=', project_name, 'since=', since);

    const suspects = await findSuspects(supabase, { project_name, since });
    console.log('[audit] found', suspects.length, 'suspect appointments');

    if (check_ghl || mode === 'reconcile') {
      await checkGhlStatus(supabase, suspects);
    }

    // Per-project counts
    const byProject: Record<string, { suspect: number; ghl_cancelled: number }> = {};
    for (const s of suspects) {
      if (!byProject[s.project_name]) byProject[s.project_name] = { suspect: 0, ghl_cancelled: 0 };
      byProject[s.project_name].suspect++;
      const g = (s.ghl_status || '').toLowerCase();
      if (g === 'cancelled' || g === 'canceled') byProject[s.project_name].ghl_cancelled++;
    }

    if (mode === 'reconcile') {
      const result = await reconcile(supabase, suspects);
      return new Response(
        JSON.stringify({
          success: true,
          mode,
          total_suspects: suspects.length,
          per_project: byProject,
          reconcile: result,
          suspects,
        }, null, 2),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        total_suspects: suspects.length,
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
