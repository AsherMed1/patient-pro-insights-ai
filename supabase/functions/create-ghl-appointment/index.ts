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
}

function isSlotUnavailableError(details: unknown): boolean {
  if (!details || typeof details !== 'object') return false;
  const msg = (details as { message?: unknown }).message;
  return typeof msg === 'string' && msg.toLowerCase().includes('slot you have selected is no longer available');
}

function parseOffsetSuffix(iso: string): string | null {
  // Matches "+HH:MM" or "-HH:MM" at end of string
  const m = iso.match(/([+-]\d\d:\d\d)$/);
  return m?.[1] ?? (iso.endsWith('Z') ? 'Z' : null);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatWithOffset(dateUtc: Date, offsetSuffix: string): string {
  if (offsetSuffix === 'Z') return dateUtc.toISOString();

  const m = offsetSuffix.match(/^([+-])(\d\d):(\d\d)$/);
  if (!m) return dateUtc.toISOString();
  const sign = m[1] === '-' ? -1 : 1;
  const hours = Number(m[2]);
  const mins = Number(m[3]);
  const offsetMinutes = sign * (hours * 60 + mins);

  // Convert UTC ms -> "local" ms for the provided fixed offset
  const localMs = dateUtc.getTime() + offsetMinutes * 60_000;
  const d = new Date(localMs);

  const yyyy = d.getUTCFullYear();
  const MM = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const HH = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const ss = pad2(d.getUTCSeconds());

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}${offsetSuffix}`;
}

function getMinutes(value: unknown, unit: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const u = typeof unit === 'string' ? unit.toLowerCase() : '';
  if (u === 'mins' || u === 'min' || u === 'minutes' || u === '') return Math.round(value);
  if (u === 'hours' || u === 'hour') return Math.round(value * 60);
  return null;
}

async function ghlJson(res: Response) {
  // GHL sometimes returns empty body on errors
  try {
    return await res.json();
  } catch {
    return null;
  }
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
    const { project_name, calendar_id, start_time, end_time, title, reason } = body;

    console.log('[CREATE-GHL-BLOCK-SLOT] Request received:', {
      project_name,
      calendar_id,
      start_time,
      end_time,
      title
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

    // First, try the block-slots endpoint (works for event calendars)
    const blockSlotPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Trying block-slots endpoint:', blockSlotPayload);

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

    let ghlData = await ghlResponse.json();

    // If block-slots succeeded (event calendar), return success
    if (ghlResponse.ok) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Event calendar block slot created successfully:', ghlData);

      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: ghlData.id || ghlData.appointmentId,
          all_block_ids: [ghlData.id || ghlData.appointmentId],
          team_members_blocked: 1,
          ghl_data: ghlData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-event calendars (round-robin, service, etc.), we need to create an appointment
    // with a placeholder contact AND an assignedUserId
    console.log('[CREATE-GHL-BLOCK-SLOT] Block-slots failed, using placeholder appointment approach...');
    console.log('[CREATE-GHL-BLOCK-SLOT] Block-slots error:', ghlData);

    // Step 1: Get the calendar details to find team members + slot size
    let assignedUserId: string | null = null;
    let calendarData: any = null;
    
    try {
      console.log('[CREATE-GHL-BLOCK-SLOT] Fetching calendar details to get team members...');
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

      // Get team members from calendar - check various possible field names
      const teamMembers = calendarData.calendar?.teamMembers || 
                          calendarData.teamMembers || 
                          calendarData.calendar?.users ||
                          calendarData.users ||
                          [];

      if (teamMembers.length > 0) {
        // Pick the first team member's userId
        assignedUserId = teamMembers[0].userId || teamMembers[0].id || teamMembers[0];
        console.log('[CREATE-GHL-BLOCK-SLOT] Using assignedUserId from calendar:', assignedUserId);
      } else {
        // Fallback: try to get the first user from the location
        console.log('[CREATE-GHL-BLOCK-SLOT] No team members on calendar, trying location users...');
        const usersResponse = await fetch(
          `https://services.leadconnectorhq.com/users/?locationId=${project.ghl_location_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${project.ghl_api_key}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
          }
        );

         const usersData = await ghlJson(usersResponse);
        console.log('[CREATE-GHL-BLOCK-SLOT] Location users:', JSON.stringify(usersData, null, 2));

        if (usersData.users && usersData.users.length > 0) {
          assignedUserId = usersData.users[0].id;
          console.log('[CREATE-GHL-BLOCK-SLOT] Using assignedUserId from location:', assignedUserId);
        }
      }
    } catch (e) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Error fetching calendar/users:', e);
    }

    // Step 2: Find or create placeholder contact
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${project.ghl_location_id}&query=Reserved+Time+Block`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

     const searchData = await ghlJson(searchResponse);
    let placeholderContactId: string | null = null;

    if (searchData.contacts && searchData.contacts.length > 0) {
      placeholderContactId = searchData.contacts[0].id;
      console.log('[CREATE-GHL-BLOCK-SLOT] Found existing placeholder contact:', placeholderContactId);
    } else {
      // Create a new placeholder contact for time blocks
      console.log('[CREATE-GHL-BLOCK-SLOT] Creating new placeholder contact...');
      const createContactResponse = await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${project.ghl_api_key}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: project.ghl_location_id,
            firstName: 'Reserved',
            lastName: 'Time Block',
            email: `reserved-block-${project.ghl_location_id.toLowerCase()}@placeholder.local`,
            tags: ['system', 'time-block', 'do-not-contact'],
          }),
        }
      );

       const createContactData = await ghlJson(createContactResponse);
      
      if (!createContactResponse.ok) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Failed to create placeholder contact:', createContactData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create placeholder contact for time block',
            details: createContactData 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      placeholderContactId = createContactData.contact?.id;
      console.log('[CREATE-GHL-BLOCK-SLOT] Created placeholder contact:', placeholderContactId);
    }

    if (!placeholderContactId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find or create placeholder contact' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

     // Step 3: For round-robin calendars, GHL often rejects long multi-hour appointments.
     // Instead, block the range by creating appointments in the calendar's slot size.
     // (If the calendar has only one team member, this fully blocks the calendar.)
     const offsetSuffix = parseOffsetSuffix(start_time) || parseOffsetSuffix(end_time) || 'Z';
     const startDate = new Date(start_time);
     const endDate = new Date(end_time);

     if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
       return new Response(
         JSON.stringify({
           success: false,
           error: 'Invalid time range',
           details: { start_time, end_time },
         }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
       );
     }

      // Pull slot sizes from the earlier calendar response when available
      // (When missing, fallback to 30-min blocks)
      const calendarSlotIntervalMin = getMinutes(
        calendarData?.calendar?.slotInterval ?? calendarData?.slotInterval,
        calendarData?.calendar?.slotIntervalUnit ?? calendarData?.slotIntervalUnit,
      );

      const calendarSlotDurationMin = getMinutes(
        calendarData?.calendar?.slotDuration ?? calendarData?.slotDuration,
        calendarData?.calendar?.slotDurationUnit ?? calendarData?.slotDurationUnit,
      );

     const intervalMin = calendarSlotIntervalMin || 30;
     const durationMin = calendarSlotDurationMin || intervalMin;

     const intervalMs = intervalMin * 60_000;
     const durationMs = durationMin * 60_000;

     const createOne = async (slotStart: Date, slotEnd: Date) => {
       const appointmentPayload: Record<string, unknown> = {
         calendarId: calendar_id,
         locationId: project.ghl_location_id,
         contactId: placeholderContactId,
         title: title || 'Reserved',
         startTime: formatWithOffset(slotStart, offsetSuffix),
         endTime: formatWithOffset(slotEnd, offsetSuffix),
         appointmentStatus: 'confirmed',
         toNotify: false,
         ignoreDateRange: true,
         ignoreAvailability: true,
       };
       if (assignedUserId) appointmentPayload.assignedUserId = assignedUserId;

       const res = await fetch(
         'https://services.leadconnectorhq.com/calendars/events/appointments',
         {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${project.ghl_api_key}`,
             'Version': '2021-04-15',
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(appointmentPayload),
         },
       );
       const data = await ghlJson(res);
       return { ok: res.ok, status: res.status, data };
     };

     console.log('[CREATE-GHL-BLOCK-SLOT] Blocking in slot increments:', { intervalMin, durationMin });

     const allIds: string[] = [];
     let skipped = 0;
     let created = 0;

     // Safety cap to avoid runaway loops
     const maxSlots = 300;
     let slotCount = 0;

     for (let t = startDate.getTime(); t + durationMs <= endDate.getTime(); t += intervalMs) {
       slotCount += 1;
       if (slotCount > maxSlots) break;

       const slotStart = new Date(t);
       const slotEnd = new Date(t + durationMs);

       const r = await createOne(slotStart, slotEnd);
       if (r.ok) {
         const id = (r.data as any)?.id || (r.data as any)?.appointmentId;
         if (id) allIds.push(id);
         created += 1;
         continue;
       }

       if (isSlotUnavailableError(r.data)) {
         skipped += 1;
         continue;
       }

       console.error('[CREATE-GHL-BLOCK-SLOT] GHL API error:', r.data);
       return new Response(
         JSON.stringify({
           success: false,
           error: 'Failed to create GHL block slot',
           details: r.data,
         }),
         { status: r.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
       );
     }

     if (created === 0) {
       // Important: if GHL has no available slots (e.g. closed day/weekend or fully booked),
       // there's nothing to block in GHL. Return success so the portal can still record the
       // local "Reserved" block without hard-failing the UX.
       return new Response(
         JSON.stringify({
           success: true,
           ghl_appointment_id: null,
           all_block_ids: [],
           team_members_blocked: 0,
           segments_created: 0,
           segments_skipped: skipped,
           ghl_synced: false,
           message: 'No available slots to reserve in that range (calendar may be closed or fully booked).',
         }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
       );
     }

     console.log('[CREATE-GHL-BLOCK-SLOT] Reserved blocks created:', { created, skipped });

     return new Response(
       JSON.stringify({
         success: true,
         ghl_appointment_id: allIds[0] || null,
         all_block_ids: allIds,
         team_members_blocked: 1,
         segments_created: created,
         segments_skipped: skipped,
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
