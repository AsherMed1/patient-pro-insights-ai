/**
 * restore-block-incident-appointments
 *
 * Bulk-restores appointments that were silently cancelled in GoHighLevel by
 * a clinic time-block. Three things happen per appointment:
 *
 *   1. GHL: appointmentStatus → 'confirmed' (PATCH the existing event), or
 *      recreate the event with original calendar/contact/time if GHL deleted it.
 *      If the slot is now taken by someone else, we DO NOT bump them — the row
 *      is reported as `slot_taken` for manual handling.
 *   2. GHL: tag the contact with `lovable_block_incident_restored` so the clinic's
 *      reschedule workflow (filtered on this tag) skips them. Optionally also
 *      enable DND for a TTL window so SMS/email comms are hard-stopped while
 *      staff manually reach out. Re-enable is queued in `pending_dnd_releases`.
 *   3. Portal: status → 'Confirmed', cancellation_reason cleared, internal note
 *      added explaining what happened, audit log row inserted.
 *
 * Modes:
 *   { mode: 'dry_run', ... } → reports per-row what would happen. No writes.
 *   { mode: 'execute', ... } → performs all the writes. Idempotent.
 *
 * Inputs (all optional except mode):
 *   project_name, appointment_ids, since,
 *   dnd_suppress (default true), dnd_window_hours (default 24),
 *   incident_start, incident_end, only_signature.
 *
 * Concurrency capped at 5 in-flight GHL calls. Caller must be admin.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESTORATION_TAG = 'lovable_block_incident_restored';
const MAX_CONCURRENCY = 5;

interface RestoreRow {
  appointment_id: string;
  project_name: string;
  lead_name: string;
  ghl_appointment_id: string | null;
  ghl_contact_id: string | null;
  ghl_status: string | null;
  action: 'patch' | 'recreate' | 'skip_no_ghl' | 'skip_already_active' | 'skip_no_api_key' | 'slot_taken' | 'error';
  detail?: string;
  new_ghl_appointment_id?: string;
}

async function fetchGhlApi(url: string, apiKey: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Version': '2021-04-15',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

async function getProjectApiKey(
  supabase: ReturnType<typeof createClient>,
  cache: Map<string, { apiKey: string | null }>,
  project_name: string
): Promise<string | null> {
  let c = cache.get(project_name);
  if (!c) {
    const { data } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', project_name)
      .single();
    c = { apiKey: (data as any)?.ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY') || null };
    cache.set(project_name, c);
  }
  return c.apiKey;
}

async function fetchGhlAppointment(apiKey: string, ghlApptId: string) {
  const r = await fetchGhlApi(
    `https://services.leadconnectorhq.com/calendars/events/appointments/${ghlApptId}`,
    apiKey,
    { method: 'GET' }
  );
  if (r.status === 404) return { status: 404, json: null as any };
  const json = await r.json().catch(() => null);
  return { status: r.status, json };
}

async function patchGhlStatusToConfirmed(apiKey: string, ghlApptId: string) {
  const r = await fetchGhlApi(
    `https://services.leadconnectorhq.com/calendars/events/appointments/${ghlApptId}`,
    apiKey,
    {
      method: 'PUT',
      body: JSON.stringify({ appointmentStatus: 'confirmed' }),
    }
  );
  const json = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, json };
}

async function recreateGhlAppointment(
  apiKey: string,
  data: { calendarId: string; contactId: string; startTime: string; endTime: string; assignedUserId?: string; title?: string; locationId?: string }
) {
  const body: any = {
    calendarId: data.calendarId,
    contactId: data.contactId,
    startTime: data.startTime,
    endTime: data.endTime,
    title: data.title || 'Restored appointment',
    appointmentStatus: 'confirmed',
  };
  if (data.assignedUserId) body.assignedUserId = data.assignedUserId;
  if (data.locationId) body.locationId = data.locationId;

  const r = await fetchGhlApi(
    `https://services.leadconnectorhq.com/calendars/events/appointments`,
    apiKey,
    { method: 'POST', body: JSON.stringify(body) }
  );
  const json = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, json };
}

async function tagGhlContact(apiKey: string, contactId: string) {
  // GHL tags endpoint adds tags without overwriting existing ones
  const r = await fetchGhlApi(
    `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
    apiKey,
    {
      method: 'POST',
      body: JSON.stringify({ tags: [RESTORATION_TAG] }),
    }
  );
  return { ok: r.ok, status: r.status };
}

async function setContactDnd(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  contactId: string,
  enable: boolean
) {
  // Re-use the established edge function pattern: set SMS/Email DND only,
  // leave Call enabled so the clinic can still phone the patient.
  const dndStatus = enable ? 'active' : 'inactive';
  const r = await fetchGhlApi(
    `https://services.leadconnectorhq.com/contacts/${contactId}`,
    apiKey,
    {
      method: 'PUT',
      body: JSON.stringify({
        dnd: enable,
        dndSettings: {
          Email: { status: dndStatus },
          SMS: { status: dndStatus },
          WhatsApp: { status: dndStatus },
        },
      }),
    }
  );
  return { ok: r.ok, status: r.status };
}

async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function loadSuspectsFromAudit(
  supabase: ReturnType<typeof createClient>,
  body: any
): Promise<any[]> {
  // If specific IDs were passed, just hydrate those.
  if (Array.isArray(body.appointment_ids) && body.appointment_ids.length > 0) {
    const { data } = await supabase
      .from('all_appointments')
      .select('id, project_name, lead_name, lead_phone_number, status, date_of_appointment, requested_time, calendar_name, ghl_appointment_id, ghl_id, was_ever_confirmed, updated_at')
      .in('id', body.appointment_ids);
    return (data || []) as any[];
  }

  // Otherwise call the audit fn locally to get the suspect list.
  const auditRes = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/audit-time-block-cancellations`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_name: body.project_name,
        since: body.since,
        check_ghl: false,
        incident_start: body.incident_start,
        incident_end: body.incident_end,
        only_signature: body.only_signature,
      }),
    }
  );
  const auditJson = await auditRes.json();
  return (auditJson.suspects || []).map((s: any) => ({
    id: s.id,
    project_name: s.project_name,
    lead_name: s.lead_name,
    lead_phone_number: s.lead_phone_number,
    status: s.status,
    date_of_appointment: s.date_of_appointment,
    requested_time: s.requested_time,
    calendar_name: s.calendar_name,
    ghl_appointment_id: s.ghl_appointment_id,
    ghl_id: s.ghl_id,
    was_ever_confirmed: s.was_ever_confirmed,
    updated_at: s.updated_at,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: 'dry_run' | 'execute' = body.mode === 'execute' ? 'execute' : 'dry_run';
    const dnd_suppress: boolean = body.dnd_suppress !== false;
    const dnd_window_hours: number = Number(body.dnd_window_hours) || 24;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // AuthN: require admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'auth required' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'invalid auth' }), { status: 401, headers: corsHeaders });
    }
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'admin role required' }), { status: 403, headers: corsHeaders });
    }

    console.log('[restore] mode=', mode, 'project=', body.project_name);

    const suspects = await loadSuspectsFromAudit(supabase, body);
    console.log('[restore] processing', suspects.length, 'suspects');

    const credCache = new Map<string, { apiKey: string | null }>();

    const processOne = async (s: any): Promise<RestoreRow> => {
      const base: RestoreRow = {
        appointment_id: s.id,
        project_name: s.project_name,
        lead_name: s.lead_name,
        ghl_appointment_id: s.ghl_appointment_id,
        ghl_contact_id: s.ghl_id,
        ghl_status: null,
        action: 'error',
      };

      const apiKey = await getProjectApiKey(supabase, credCache, s.project_name);
      if (!apiKey) {
        base.action = 'skip_no_api_key';
        base.detail = 'project missing ghl_api_key';
        return base;
      }
      if (!s.ghl_appointment_id) {
        base.action = 'skip_no_ghl';
        base.detail = 'no ghl_appointment_id on portal row';
        return base;
      }

      // Step 1: fetch GHL ground truth
      const fetched = await fetchGhlAppointment(apiKey, s.ghl_appointment_id);

      if (fetched.status === 404) {
        // Need to recreate
        if (!s.ghl_id) {
          base.action = 'error';
          base.detail = 'GHL event deleted and no contact_id available to recreate';
          return base;
        }
        // Build slot from portal date + time
        const calId = body.calendar_overrides?.[s.project_name] || null;
        if (!calId && !s.calendar_name) {
          base.action = 'error';
          base.detail = 'GHL event deleted and no calendar info to recreate';
          return base;
        }
        // Lookup the GHL calendarId for this calendar_name on this project
        // (best-effort; if we don't have it, surface to operator)
        const { data: calRow } = await supabase
          .from('project_calendars')
          .select('ghl_calendar_id')
          .eq('project_name', s.project_name)
          .eq('calendar_name', s.calendar_name)
          .maybeSingle();
        const calendarId = (calRow as any)?.ghl_calendar_id || calId;
        if (!calendarId) {
          base.action = 'error';
          base.detail = `cannot resolve GHL calendar id for "${s.calendar_name}"`;
          return base;
        }

        // Compute start/end from date_of_appointment + requested_time (assume 30 min)
        if (!s.date_of_appointment || !s.requested_time) {
          base.action = 'error';
          base.detail = 'missing date/time to recreate';
          return base;
        }
        const startISO = new Date(`${s.date_of_appointment.slice(0,10)}T${s.requested_time}`).toISOString();
        const endISO = new Date(new Date(startISO).getTime() + 30 * 60_000).toISOString();

        base.action = 'recreate';
        base.detail = `would recreate on calendar ${calendarId} at ${startISO}`;
        if (mode === 'dry_run') return base;

        const created = await recreateGhlAppointment(apiKey, {
          calendarId,
          contactId: s.ghl_id,
          startTime: startISO,
          endTime: endISO,
          title: `Restored: ${s.lead_name}`,
        });
        if (!created.ok) {
          // Detect slot-taken style errors
          const msg = JSON.stringify(created.json || '');
          if (created.status === 409 || /not available|already booked|conflict/i.test(msg)) {
            base.action = 'slot_taken';
            base.detail = `recreate refused: ${created.status} ${msg.slice(0, 200)}`;
            return base;
          }
          base.action = 'error';
          base.detail = `recreate failed: ${created.status} ${msg.slice(0, 200)}`;
          return base;
        }
        base.new_ghl_appointment_id = created.json?.id || created.json?.appointment?.id;
      } else if (fetched.status === 200) {
        const apptStatus = (fetched.json?.appointment?.appointmentStatus || '').toLowerCase();
        base.ghl_status = apptStatus;

        if (apptStatus !== 'cancelled' && apptStatus !== 'canceled') {
          base.action = 'skip_already_active';
          base.detail = `GHL status is "${apptStatus}", nothing to restore`;
          return base;
        }
        base.action = 'patch';
        base.detail = `would PATCH appointmentStatus → confirmed`;
        if (mode === 'dry_run') return base;

        const patched = await patchGhlStatusToConfirmed(apiKey, s.ghl_appointment_id);
        if (!patched.ok) {
          const msg = JSON.stringify(patched.json || '');
          if (patched.status === 409 || /not available|already booked|conflict/i.test(msg)) {
            base.action = 'slot_taken';
            base.detail = `patch refused: ${patched.status} ${msg.slice(0, 200)}`;
            return base;
          }
          base.action = 'error';
          base.detail = `patch failed: ${patched.status} ${msg.slice(0, 200)}`;
          return base;
        }
      } else {
        base.action = 'error';
        base.detail = `GHL fetch HTTP ${fetched.status}`;
        return base;
      }

      // Step 2: tag the contact + optionally DND-suppress (execute mode only — already returned above for dry_run)
      if (s.ghl_id) {
        const tagged = await tagGhlContact(apiKey, s.ghl_id);
        if (!tagged.ok) {
          console.warn('[restore] tagging failed for', s.ghl_id, tagged.status);
        }

        if (dnd_suppress) {
          const dnd = await setContactDnd(supabase, apiKey, s.ghl_id, true);
          if (dnd.ok) {
            // Queue release
            const releaseAt = new Date(Date.now() + dnd_window_hours * 3600 * 1000).toISOString();
            await supabase.from('pending_dnd_releases').insert({
              ghl_contact_id: s.ghl_id,
              project_name: s.project_name,
              appointment_id: s.id,
              release_at: releaseAt,
            });
          } else {
            console.warn('[restore] DND set failed for', s.ghl_id, dnd.status);
          }
        }
      }

      // Step 3: mirror back into portal
      const newGhlId = base.new_ghl_appointment_id;
      const portalUpdate: any = {
        status: 'Confirmed',
        cancellation_reason: null,
        updated_at: new Date().toISOString(),
      };
      if (newGhlId) portalUpdate.ghl_appointment_id = newGhlId;

      const { error: updErr } = await supabase
        .from('all_appointments')
        .update(portalUpdate)
        .eq('id', s.id);
      if (updErr) {
        base.action = 'error';
        base.detail = `portal update failed: ${updErr.message}`;
        return base;
      }

      await supabase.from('appointment_notes').insert({
        appointment_id: s.id,
        note_text:
          `[Block-incident restoration ${new Date().toISOString().slice(0,10)}] ` +
          `This appointment was auto-cancelled by GoHighLevel when a clinic time block was created over the slot, ` +
          `and a reschedule workflow was triggered. Both have been reversed: status restored to "Confirmed", ` +
          `contact tagged with "${RESTORATION_TAG}", ` +
          (dnd_suppress ? `and SMS/Email DND temporarily enabled for ${dnd_window_hours}h. ` : '') +
          `Patient may have already received reschedule SMS/email — please call to verbally reconfirm the original time.`,
        created_by: null,
      });

      await supabase.from('security_audit_log').insert({
        event_type: 'time_block_restoration',
        details: {
          appointment_id: s.id,
          lead_name: s.lead_name,
          project_name: s.project_name,
          ghl_appointment_id: s.ghl_appointment_id,
          new_ghl_appointment_id: newGhlId || null,
          ghl_contact_id: s.ghl_id,
          old_portal_status: s.status,
          new_portal_status: 'Confirmed',
          dnd_suppressed: dnd_suppress,
          dnd_window_hours: dnd_suppress ? dnd_window_hours : null,
          restored_by: userId,
          timestamp: new Date().toISOString(),
        },
      });

      return base;
    };

    const results = await pMap(suspects, processOne, MAX_CONCURRENCY);

    // Summary
    const summary: Record<string, number> = {};
    for (const r of results) summary[r.action] = (summary[r.action] || 0) + 1;

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        total: results.length,
        summary,
        results,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[restore] fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
