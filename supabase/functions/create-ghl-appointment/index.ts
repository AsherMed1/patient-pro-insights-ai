import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateBlockSlotRequest {
  project_name: string;
  calendar_id: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  title?: string;
  reason?: string;
  // For local record creation
  calendar_name?: string;
  user_name?: string;
  user_id?: string;
  create_local_record?: boolean;
  // Telemetry — IDs of patient appointments that were detected to overlap this block
  // (passed by ReserveTimeBlockDialog after the conflict scan). We log these to
  // security_audit_log so we have a paper trail if GHL silently cancels them.
  overlapping_appointment_ids?: string[];
}

interface CalendarData {
  calendar?: {
    calendarType?: string;
  };
  calendarType?: string;
}

async function ghlJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Post a Slack message to the calendar-updates channel. Always non-blocking.
async function postSlack(payload: unknown): Promise<void> {
  const webhook = Deno.env.get('SLACK_CALENDAR_UPDATES_WEBHOOK_URL');
  if (!webhook) {
    console.warn('[CREATE-GHL-BLOCK-SLOT] SLACK_CALENDAR_UPDATES_WEBHOOK_URL not configured — skipping Slack message');
    return;
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('[CREATE-GHL-BLOCK-SLOT] Slack message sent, status:', res.status);
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Slack message failed (non-blocking):', err);
  }
}

/**
 * Resolve the GHL user IDs to block individually when a calendar refuses a
 * calendar-level block (round-robin / service calendars). Prefers the
 * calendar's own team members; falls back to all users on the location.
 */
async function resolveCalendarUserIds(
  calendarId: string,
  locationId: string,
  apiKey: string,
): Promise<string[]> {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-04-15',
    'Accept': 'application/json',
  };

  try {
    const calRes = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}`,
      { method: 'GET', headers },
    );
    const calData = await ghlJson(calRes);
    const members = calData?.calendar?.teamMembers || calData?.teamMembers || [];
    const ids = (Array.isArray(members) ? members : [])
      .map((m: any) => m?.userId || m?.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
    if (ids.length > 0) return Array.from(new Set(ids));
    console.warn('[CREATE-GHL-BLOCK-SLOT] No teamMembers on calendar — falling back to location users');
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Calendar detail fetch failed:', err);
  }

  try {
    const usersRes = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${locationId}`,
      { method: 'GET', headers },
    );
    const usersData = await ghlJson(usersRes);
    const users = usersData?.users || [];
    const ids = (Array.isArray(users) ? users : [])
      .map((u: any) => u?.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
    return Array.from(new Set(ids));
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Location users fetch failed:', err);
    return [];
  }
}

// Helper to delete GHL block on rollback
async function deleteGhlBlock(eventId: string, apiKey: string): Promise<void> {
  if (!eventId) {
    console.log('[CREATE-GHL-BLOCK-SLOT] No event ID to rollback');
    return;
  }
  
  try {
    console.log('[CREATE-GHL-BLOCK-SLOT] Attempting rollback for event:', eventId);
    const response = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[CREATE-GHL-BLOCK-SLOT] Rollback result:', response.status);
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Rollback failed:', err);
  }
}

// Helper to create local record and audit note
async function createLocalRecord(
  supabase: ReturnType<typeof createClient>,
  params: {
    project_name: string;
    title: string;
    start_time: string;
    end_time: string;
    calendar_name: string;
    user_name: string;
    user_id?: string;
    reason?: string;
    ghl_appointment_id: string | null;
    ghl_location_id: string;
  }
): Promise<{ success: boolean; local_appointment_id?: string; error?: string }> {
  const {
    project_name,
    title,
    start_time,
    end_time,
    calendar_name,
    user_name,
    user_id,
    reason,
    ghl_appointment_id,
    ghl_location_id,
  } = params;

  // Parse dates from ISO string
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  
  // Format for database (use the date/time from the ISO string directly)
  const dateOfAppointment = start_time.split('T')[0];
  const requestedTime = start_time.substring(11, 16);
  const reservedEndTime = end_time.substring(11, 16);
  const today = new Date().toISOString().split('T')[0];

  const localRecord = {
    project_name,
    lead_name: title || 'Reserved',
    date_of_appointment: dateOfAppointment,
    requested_time: requestedTime,
    reserved_end_time: reservedEndTime,
    calendar_name,
    status: 'Confirmed',
    is_reserved_block: true,
    internal_process_complete: true,
    ghl_appointment_id,
    ghl_location_id,
    date_appointment_created: today,
    patient_intake_notes: `Time block reserved by ${user_name} on ${new Date().toLocaleDateString()}\nReason: ${reason || 'Not specified'}\nCalendar: ${calendar_name}\nTime: ${requestedTime} - ${reservedEndTime}`,
  };

  console.log('[CREATE-GHL-BLOCK-SLOT] Creating local record:', localRecord);

  const { data: newAppt, error: insertError } = await supabase
    .from('all_appointments')
    .insert(localRecord)
    .select()
    .single();

  if (insertError) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Local insert failed:', insertError);
    return { success: false, error: insertError.message };
  }

  console.log('[CREATE-GHL-BLOCK-SLOT] Local record created:', newAppt?.id);

  // Create audit note (non-critical)
  if (user_id && newAppt?.id) {
    try {
      await supabase.from('appointment_notes').insert({
        appointment_id: newAppt.id,
        note_text: `Reserved time block created by ${user_name}. Reason: ${reason || 'Not specified'}. Calendar: ${calendar_name}.`,
        created_by: user_id,
      });
      console.log('[CREATE-GHL-BLOCK-SLOT] Audit note created');
    } catch (noteErr) {
      console.warn('[CREATE-GHL-BLOCK-SLOT] Audit note failed (non-critical):', noteErr);
    }
  }

  return { success: true, local_appointment_id: newAppt?.id };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateBlockSlotRequest = await req.json();
    const { 
      project_name, 
      calendar_id, 
      start_time, 
      end_time, 
      title, 
      reason,
      calendar_name,
      user_name,
      user_id,
      create_local_record,
      overlapping_appointment_ids,
    } = body;

    console.log('[CREATE-GHL-BLOCK-SLOT] Request received:', {
      project_name,
      calendar_id,
      calendar_name,
      start_time,
      end_time,
      title,
      create_local_record,
      user_name,
      overlapping_appointment_count: overlapping_appointment_ids?.length || 0,
    });

    // Validate required fields
    if (!project_name || !calendar_id || !start_time || !end_time) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: project_name, calendar_id, start_time, end_time' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project to get GHL credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ghl_location_id, ghl_api_key, timezone')
      .eq('project_name', project_name)
      .single();

    if (projectError || !project) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Project not found:', projectError);
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.ghl_location_id || !project.ghl_api_key) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Project missing GHL credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Project is not configured for GHL integration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch calendar details to determine double-booking capacity
    // (appointmentPerSlot). We fetch this BEFORE the overlap guard so the
    // guard can be capacity-aware — a calendar configured for multiple
    // bookings per slot does NOT silently cancel coexisting appointments
    // when a block is created.
    let calendarData: CalendarData | null = null;
    let appointmentPerSlot = 1;

    try {
      console.log('[CREATE-GHL-BLOCK-SLOT] Fetching calendar details...');
      const calendarResponse = await fetch(
        `https://services.leadconnectorhq.com/calendars/${calendar_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${project.ghl_api_key}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json',
          },
        }
      );

      calendarData = await ghlJson(calendarResponse);
      console.log('[CREATE-GHL-BLOCK-SLOT] Calendar data:', JSON.stringify(calendarData, null, 2));

      // Extract appointmentPerSlot (GHL exposes it under several field names).
      const cal: any = calendarData?.calendar || calendarData || {};
      const rawPerSlot =
        cal.appointmentPerSlot ??
        cal.appointmentsPerSlot ??
        cal.appoinmentPerSlot ?? // known GHL typo
        cal.slotsPerAppointment ??
        1;
      const perSlot = Number(rawPerSlot);
      appointmentPerSlot = Number.isFinite(perSlot) && perSlot >= 1 ? perSlot : 1;
      console.log('[CREATE-GHL-BLOCK-SLOT] Calendar appointmentPerSlot capacity:', appointmentPerSlot);
    } catch (e) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Error fetching calendar:', e);
    }

    // ────────────────────────────────────────────────────────────────────
    // Server-side overlap guard. Re-runs the same check as the client-side
    // blockConflictScan, but here on the server we cannot be bypassed by a
    // stale UI, an external caller, or a manual API call. If any
    // confirmed-tier patient appointment overlaps the proposed block AND
    // the calendar cannot accommodate coexistence (per-slot capacity),
    // we abort with 409 instead of letting GHL silently cancel it.
    // (Incident: VIM 2026-04-21 — see plan.md.)
    // ────────────────────────────────────────────────────────────────────
    if (create_local_record && calendar_name) {
      const TERMINAL = new Set([
        'cancelled','canceled','no show','noshow','no-show',
        'showed','won','oon','do not call','donotcall','rescheduled',
      ]);

      const dateStr = start_time.split('T')[0];
      const startMin = (() => {
        const t = start_time.substring(11, 16);
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      })();
      const endMinNew = (() => {
        const t = end_time.substring(11, 16);
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      })();


      const { data: candidates, error: scanErr } = await supabase
        .from('all_appointments')
        .select('id, lead_name, status, requested_time, reserved_end_time, calendar_name, was_ever_confirmed, is_reserved_block, is_superseded')
        .eq('project_name', project_name)
        .eq('calendar_name', calendar_name)
        .gte('date_of_appointment', `${dateStr}T00:00:00`)
        .lte('date_of_appointment', `${dateStr}T23:59:59`);

      if (scanErr) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Server overlap scan failed:', scanErr);
      } else if (candidates) {
        // Model existing blocks as ranges [startMin, endMin) so a full-day
        // block correctly occupies every slot it covers, not just its start.
        interface BlockRange { startMin: number; endMin: number; row: any }
        interface PatientRow { row: any; status: string; slotMin: number; isConfirmedTier: boolean }
        const blocks: BlockRange[] = [];
        const patients: PatientRow[] = [];

        const parseMin = (t: string | null): number | null => {
          const m = /^(\d{1,2}):(\d{2})/.exec((t || '').toString().trim());
          if (!m) return null;
          return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        };

        for (const row of candidates as any[]) {
          if (row.is_superseded === true) continue;
          const apptMin = parseMin(row.requested_time);
          if (apptMin === null) continue;

          if (row.is_reserved_block === true) {
            const endRaw = parseMin(row.reserved_end_time);
            const endMin = endRaw !== null && endRaw > apptMin ? endRaw : apptMin + 1;
            // Only interested in blocks that touch the new window.
            if (apptMin < endMinNew && endMin > startMin) {
              blocks.push({ startMin: apptMin, endMin, row });
            }
            continue;
          }

          if (!(apptMin >= startMin && apptMin < endMinNew)) continue;
          const status = (row.status || '').toString().trim().toLowerCase();
          if (TERMINAL.has(status)) continue;
          const isConfirmedTier =
            !['', 'pending'].includes(status) || row.was_ever_confirmed === true;
          patients.push({ row, status, slotMin: apptMin, isConfirmedTier });
        }

        const patientsAt = (T: number) => patients.filter((p) => p.slotMin === T).length;
        const blocksCovering = (T: number) =>
          blocks.filter((b) => T >= b.startMin && T < b.endMin).length;
        const formatMin = (m: number) => {
          const h = Math.floor(m / 60);
          const mm = m % 60;
          return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        };

        const blocking: any[] = [];
        const slotsWithBlocking = new Set<number>();

        for (const p of patients) {
          if (!p.isConfirmedTier) continue;
          const projected = patientsAt(p.slotMin) + blocksCovering(p.slotMin) + 1;
          if (appointmentPerSlot > 1 && projected <= appointmentPerSlot) {
            console.log(
              '[CREATE-GHL-BLOCK-SLOT] coexist overlap allowed — capacity',
              appointmentPerSlot, 'accommodates', projected,
              'for', p.row.lead_name, '@', p.row.requested_time
            );
            continue;
          }
          blocking.push(p.row);
          slotsWithBlocking.add(p.slotMin);
        }

        // Iterate every candidate slot time (patient times + block starts)
        // inside the new-block window and synthesize a capacity refusal for
        // any that overflow — this catches patient+block and blocks-only
        // saturation alike.
        const candidateTs = new Set<number>();
        for (const b of blocks) if (b.startMin >= startMin && b.startMin < endMinNew) candidateTs.add(b.startMin);
        for (const p of patients) candidateTs.add(p.slotMin);
        const reportedTs = new Set<number>();
        for (const T of candidateTs) {
          if (slotsWithBlocking.has(T)) continue;
          if (reportedTs.has(T)) continue;
          const pAt = patientsAt(T);
          const bAt = blocksCovering(T);
          const total = pAt + bAt;
          if (total + 1 <= appointmentPerSlot) continue;
          reportedTs.add(T);
          console.log(
            '[CREATE-GHL-BLOCK-SLOT] slot capacity exceeded — capacity',
            appointmentPerSlot, 'patients', pAt, 'blocks covering', bAt, '@', formatMin(T)
          );
          const blockPart = `${bAt} reserved block${bAt === 1 ? '' : 's'} covering ${formatMin(T)}`;
          const patientPart = pAt > 0 ? `${pAt} appointment${pAt === 1 ? '' : 's'} + ` : '';
          blocking.push({
            id: `block-cap::${T}`,
            lead_name: `Slot full (${total}/${appointmentPerSlot} — ${patientPart}${blockPart})`,
            status: 'Reserved block',
            requested_time: formatMin(T),
            was_ever_confirmed: false,
          });
        }



        if (blocking.length > 0) {
          console.error('[CREATE-GHL-BLOCK-SLOT] Server-side guard tripped — refusing block. Overlapping:',
            blocking.map((b: any) => ({ id: b.id, lead: b.lead_name, status: b.status, time: b.requested_time }))
          );

          await supabase.from('security_audit_log').insert({
            event_type: 'block_creation_blocked_server_guard',
            user_id: user_id || null,
            details: {
              project_name,
              calendar_id,
              calendar_name,
              start_time,
              end_time,
              attempted_by: user_name || 'Unknown',
              appointment_per_slot: appointmentPerSlot,
              blocking_appointments: blocking.map((b: any) => ({
                id: b.id, lead_name: b.lead_name, status: b.status,
                requested_time: b.requested_time, was_ever_confirmed: b.was_ever_confirmed,
              })),
              note: 'Server-side overlap guard refused block creation to prevent silent GHL cancellation.',
              timestamp: new Date().toISOString(),
            },
          });

          const capacityOnly = blocking.every((b: any) => b.status === 'Reserved block');
          return new Response(
            JSON.stringify({
              success: false,
              error: capacityOnly
                ? `This slot is already at capacity (${appointmentPerSlot}/${appointmentPerSlot}) from existing reserved blocks.`
                : 'Block would silently cancel confirmed patient appointments',
              code: capacityOnly ? 'SLOT_CAPACITY_EXCEEDED' : 'CONFIRMED_TIER_OVERLAP',
              overlapping_appointments: blocking.map((b: any) => ({
                id: b.id, lead_name: b.lead_name, status: b.status,
                requested_time: b.requested_time,
              })),
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        }
      }
    }

    // Step 2: Try block-slots endpoint with calendarId first (works for event calendars)
    const blockSlotPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Trying block-slots with calendarId:', blockSlotPayload);

    let ghlResponse = await fetch(
      'https://services.leadconnectorhq.com/calendars/events/block-slots',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockSlotPayload),
      }
    );

    let ghlData = await ghlJson(ghlResponse);
    let ghlAppointmentId: string | null = null;
    let ghlSynced = false;
    let allBlockIds: string[] = [];
    let blockLevel: 'calendar' | 'user' = 'calendar';
    let teamMembersBlocked = 0;

    // If block-slots with calendarId succeeded (event calendar)
    if (ghlResponse.ok) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Block slot created successfully with calendarId:', ghlData);
      ghlAppointmentId = ghlData?.id || ghlData?.appointmentId || null;
      allBlockIds = [ghlAppointmentId].filter(Boolean) as string[];
      ghlSynced = true;
    } else {
      // Calendar-level block failed. The ONLY sanctioned fallback is when GHL
      // itself refuses because the calendar is not an event calendar
      // (round-robin / service calendars). In that case we block each team
      // member individually. Every other error stays a hard failure.
      console.error('[CREATE-GHL-BLOCK-SLOT] Calendar-level block-slots failed:', ghlResponse.status, ghlData);

      const ghlErrorDetail = ghlData?.message || ghlData?.error || JSON.stringify(ghlData) || `HTTP ${ghlResponse.status}`;
      const errorText = Array.isArray(ghlErrorDetail) ? ghlErrorDetail.join(' ') : String(ghlErrorDetail);
      const isNotEventCalendar =
        (ghlResponse.status === 400 || ghlResponse.status === 422) &&
        /not an event calendar/i.test(errorText);

      let failureReason = errorText;
      let fallbackUserIds: string[] = [];

      if (isNotEventCalendar) {
        console.log('[CREATE-GHL-BLOCK-SLOT] Non-event calendar detected — resolving team members for user-level fallback');
        fallbackUserIds = await resolveCalendarUserIds(
          calendar_id,
          project.ghl_location_id,
          project.ghl_api_key,
        );
        console.log('[CREATE-GHL-BLOCK-SLOT] Fallback user IDs:', fallbackUserIds);

        if (fallbackUserIds.length === 0) {
          failureReason = `${errorText} — and no team members/location users could be resolved for a user-level fallback.`;
        } else {
          const createdIds: string[] = [];
          let perUserError: string | null = null;

          for (const assignedUserId of fallbackUserIds) {
            const userRes = await fetch(
              'https://services.leadconnectorhq.com/calendars/events/block-slots',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${project.ghl_api_key}`,
                  'Version': '2021-04-15',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  locationId: project.ghl_location_id,
                  assignedUserId,
                  title: title || 'Reserved',
                  startTime: start_time,
                  endTime: end_time,
                }),
              }
            );
            const userData = await ghlJson(userRes);
            const blockId = userData?.id || userData?.appointmentId || null;

            if (!userRes.ok || !blockId) {
              perUserError = `User-level block failed for user ${assignedUserId} (HTTP ${userRes.status}): ${userData?.message || userData?.error || JSON.stringify(userData)}`;
              console.error('[CREATE-GHL-BLOCK-SLOT]', perUserError);
              break;
            }
            createdIds.push(blockId);
          }

          if (perUserError) {
            // Partial failure = full failure. Roll back what we created.
            console.error('[CREATE-GHL-BLOCK-SLOT] Rolling back', createdIds.length, 'partial user-level blocks');
            for (const id of createdIds) {
              await deleteGhlBlock(id, project.ghl_api_key);
            }
            failureReason = perUserError;
          } else {
            allBlockIds = createdIds;
            ghlAppointmentId = createdIds[0];
            ghlSynced = true;
            blockLevel = 'user';
            teamMembersBlocked = createdIds.length;
            console.log('[CREATE-GHL-BLOCK-SLOT] User-level fallback succeeded for', teamMembersBlocked, 'team member(s)');

            try {
              await supabase.from('security_audit_log').insert({
                event_type: 'block_created_user_level_fallback',
                user_id: user_id || null,
                details: {
                  project_name,
                  calendar_id,
                  calendar_name: calendar_name || null,
                  start_time,
                  end_time,
                  title: title || 'Reserved',
                  reason: reason || null,
                  attempted_by: user_name || 'Portal User',
                  ghl_user_ids: createdIds.length === fallbackUserIds.length ? fallbackUserIds : fallbackUserIds.slice(0, createdIds.length),
                  ghl_block_ids: createdIds,
                  note: 'Calendar is not an event calendar in GHL — blocked each team member individually.',
                  timestamp: new Date().toISOString(),
                },
              });
            } catch (auditErr) {
              console.error('[CREATE-GHL-BLOCK-SLOT] Fallback audit log failed (non-blocking):', auditErr);
            }

            // No extra Slack post here — the portal already sends the standard
            // "Calendar Update: Reserved Time Block" message via notify-calendar-update.
          }
        }
      }

      if (!ghlSynced) {
        // Hard failure — no block in GHL, no local reservation. Alert Slack and audit.
        try {
          await supabase.from('security_audit_log').insert({
            event_type: 'block_creation_failed_calendar_level',
            user_id: user_id || null,
            details: {
              project_name,
              calendar_id,
              calendar_name: calendar_name || null,
              start_time,
              end_time,
              title: title || 'Reserved',
              reason: reason || null,
              attempted_by: user_name || 'Portal User',
              ghl_status: ghlResponse.status,
              ghl_error: failureReason,
              user_level_fallback_attempted: isNotEventCalendar,
              fallback_user_count: fallbackUserIds.length,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (auditErr) {
          console.error('[CREATE-GHL-BLOCK-SLOT] Audit log failed (non-blocking):', auditErr);
        }

        await postSlack({
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🚫 Reserved Time Block FAILED', emoji: true },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Clinic:*\n${project_name}` },
                { type: 'mrkdwn', text: `*Calendar:*\n${calendar_name || calendar_id}` },
                { type: 'mrkdwn', text: `*Attempted By:*\n${user_name || 'Portal User'}` },
                { type: 'mrkdwn', text: `*Window:*\n${start_time} → ${end_time}` },
              ],
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*GHL Error (${ghlResponse.status}):*\n\`\`\`${String(failureReason).slice(0, 800)}\`\`\`` },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: isNotEventCalendar
                    ? '⚠️ Calendar-level block was rejected and the user-level fallback also failed. The reservation was NOT saved.'
                    : '⚠️ No block was created. The reservation was NOT saved. Check the calendar type/configuration in GHL.',
                },
              ],
            },
          ],
        });

        return new Response(
          JSON.stringify({
            success: false,
            code: 'CALENDAR_LEVEL_BLOCK_FAILED',
            error: `GHL rejected the block (HTTP ${ghlResponse.status}). The reservation was not saved. The team has been notified in Slack to review this calendar's configuration.`,
            ghl_error: failureReason,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Telemetry: log when a block was successfully created over patient appointments
    // that the client-side scan flagged. This catches cases where GHL silently cancels
    // overlapping events even after our pre-flight guards.
    if (ghlSynced && overlapping_appointment_ids && overlapping_appointment_ids.length > 0) {
      try {
        await supabase.from('security_audit_log').insert({
          event_type: 'block_overlap_warning',
          user_id: user_id || null,
          details: {
            project_name,
            calendar_id,
            calendar_name: calendar_name || null,
            start_time,
            end_time,
            title: title || 'Reserved',
            reason: reason || null,
            blocked_by: user_name || 'Portal User',
            ghl_block_ids: allBlockIds,
            overlapping_appointment_ids,
            overlap_count: overlapping_appointment_ids.length,
            note: 'Block created over patient appointment slot(s). GHL may have silently cancelled overlapping events.',
            timestamp: new Date().toISOString(),
          },
        });
        console.log('[CREATE-GHL-BLOCK-SLOT] Logged block_overlap_warning for', overlapping_appointment_ids.length, 'appointment(s)');
      } catch (auditErr) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Failed to log block_overlap_warning:', auditErr);
        // Non-blocking — don't fail the request just because audit failed
      }
    }

    // Step 4: Create local record if requested
    if (create_local_record && calendar_name) {
      const localResult = await createLocalRecord(supabase, {
        project_name,
        title: title || 'Reserved',
        start_time,
        end_time,
        calendar_name,
        user_name: user_name || 'Portal User',
        user_id,
        reason,
        ghl_appointment_id: ghlAppointmentId,
        ghl_location_id: project.ghl_location_id,
      });

      if (!localResult.success) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Local insert failed, attempting rollback...');
        
        // Rollback all GHL blocks we created
        for (const blockId of allBlockIds) {
          await deleteGhlBlock(blockId, project.ghl_api_key);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to save reservation locally: ${localResult.error}. GHL block(s) rolled back.`,
            rollback_performed: true,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return success with both GHL and local info
      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: ghlAppointmentId,
          local_appointment_id: localResult.local_appointment_id,
          all_block_ids: allBlockIds,
          ghl_synced: ghlSynced,
          local_saved: true,
          block_level: blockLevel,
          team_members_blocked: teamMembersBlocked,
          message: blockLevel === 'user'
            ? `Reserved — blocked ${teamMembersBlocked} provider${teamMembersBlocked === 1 ? '' : 's'} (calendar is not an event calendar in GHL)`
            : 'Successfully created calendar-level reservation',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not creating local record, return GHL-only result (legacy behavior)
    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: ghlAppointmentId,
        all_block_ids: allBlockIds,
        ghl_synced: ghlSynced,
        local_saved: false,
        block_level: blockLevel,
        team_members_blocked: teamMembersBlocked,
        message: blockLevel === 'user'
          ? `Successfully created ${teamMembersBlocked} user-level block${teamMembersBlocked === 1 ? '' : 's'} in GHL`
          : 'Successfully created calendar-level block in GHL',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
