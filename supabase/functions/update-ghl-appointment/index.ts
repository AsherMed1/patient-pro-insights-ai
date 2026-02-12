import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { formatInTimeZone, fromZonedTime } from "npm:date-fns-tz@3.2.0";
import { addMinutes } from "npm:date-fns@3.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map portal statuses to GHL appointmentStatus values
const STATUS_MAP: Record<string, string> = {
  'Confirmed': 'confirmed',
  'Cancelled': 'cancelled',
  'No Show': 'noshow',
  'Showed': 'showed',
};

async function resolveApiKey(
  ghl_api_key: string | undefined,
  project_name: string | undefined
): Promise<string | null> {
  // Use provided key first
  if (ghl_api_key) return ghl_api_key;

  // Look up from project if project_name given
  if (project_name) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data } = await supabase
        .from('projects')
        .select('ghl_api_key')
        .eq('project_name', project_name)
        .single();

      if (data?.ghl_api_key) {
        console.log('Resolved API key from project:', project_name);
        return data.ghl_api_key;
      }
    } catch (err) {
      console.warn('Failed to look up project API key:', err);
    }
  }

  // Fall back to global key
  return Deno.env.get('GHL_LOCATION_API_KEY') || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ghl_appointment_id,
      ghl_location_id,
      new_date,
      new_time,
      timezone,
      ghl_api_key,
      calendar_id,
      title,
      status,
      project_name,
    } = await req.json();

    // Determine operation type
    const isCalendarTransfer = calendar_id && !new_date && !new_time && !status;
    const isStatusUpdate = status && !new_date && !new_time && !calendar_id;
    const isReschedule = new_date && new_time;

    // Validate required fields
    if (!ghl_appointment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: ghl_appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isCalendarTransfer && !isStatusUpdate && !isReschedule) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          hint: 'Provide new_date+new_time for reschedule, calendar_id for transfer, or status for status update'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key
    const apiKey = await resolveApiKey(ghl_api_key, project_name);
    if (!apiKey) {
      console.error('No GHL API key available');
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For status updates, map portal status to GHL value
    let ghlStatus: string | undefined;
    if (status) {
      ghlStatus = STATUS_MAP[status];
      if (!ghlStatus) {
        console.warn(`Status "${status}" has no GHL mapping — skipping GHL sync`);
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: `Status "${status}" does not map to a GHL appointmentStatus value`,
            appointment_id: ghl_appointment_id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Updating GHL appointment:', {
      ghl_appointment_id,
      ghl_location_id,
      calendar_id,
      isCalendarTransfer,
      isStatusUpdate,
      isReschedule,
      new_date,
      new_time,
      status,
      ghlStatus,
    });

    // Fetch existing appointment to get current data
    const getResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/appointments/${ghl_appointment_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Accept': 'application/json',
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to fetch existing appointment:', getResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch existing appointment from GoHighLevel',
          details: errorText,
          status: getResponse.status,
        }),
        { status: getResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingAppointment = await getResponse.json();
    let assignedUserId = existingAppointment.appointment?.assignedUserId;
    const existingCalendarId = existingAppointment.appointment?.calendarId;
    const existingStartTime = existingAppointment.appointment?.startTime;
    const existingEndTime = existingAppointment.appointment?.endTime;

    // Fallback: fetch assignedUserId from calendar team members
    if (!assignedUserId && existingCalendarId) {
      console.warn('No assignedUserId found, attempting fallback from calendar:', existingCalendarId);
      try {
        const calendarResponse = await fetch(
          `https://services.leadconnectorhq.com/calendars/${existingCalendarId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Version': '2021-04-15',
              'Accept': 'application/json',
            },
          }
        );
        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json();
          const teamMembers = calendarData?.calendar?.teamMembers || [];
          if (teamMembers.length > 0) {
            assignedUserId = teamMembers[0].userId;
            console.log('Found fallback assignedUserId from calendar:', assignedUserId);
          }
        }
      } catch (calendarError) {
        console.warn('Failed to fetch calendar for fallback user:', calendarError);
      }
    }

    console.log('Existing appointment data:', { assignedUserId, existingCalendarId, existingStartTime });

    // Build the update payload
    let updatePayload: any = {
      toNotify: true,
      ignoreDateRange: true,
      ignoreFreeSlotValidation: true,
    };

    if (assignedUserId) {
      updatePayload.assignedUserId = assignedUserId;
    }

    if (calendar_id) {
      updatePayload.calendarId = calendar_id;
      console.log('Including calendar transfer to:', calendar_id);
    }

    if (title) {
      updatePayload.title = title;
      console.log('Updating appointment title to:', title);
    }

    // Rescheduling
    if (isReschedule) {
      const tz = timezone || 'America/Chicago';
      const startDateTimeInTz = fromZonedTime(`${new_date}T${new_time}`, tz);
      const endDateTimeInTz = addMinutes(startDateTimeInTz, 30);
      const startTime = formatInTimeZone(startDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
      const endTime = formatInTimeZone(endDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");

      updatePayload.startTime = startTime;
      updatePayload.endTime = endTime;
      updatePayload.appointmentStatus = ghlStatus || 'confirmed';
      console.log('Including reschedule to:', { startTime, endTime });
    } else {
      // For status-only or calendar transfer, keep existing times
      updatePayload.startTime = existingStartTime;
      updatePayload.endTime = existingEndTime;
      updatePayload.appointmentStatus = ghlStatus || 'confirmed';
    }

    // PUT to GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/appointments/${ghl_appointment_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('GHL API error:', ghlResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to update appointment in GoHighLevel',
          details: errorText,
          status: ghlResponse.status,
          ghl_appointment_id,
          attempted_update: updatePayload,
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await ghlResponse.json();
    console.log('Successfully updated GHL appointment:', result);

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: ghl_appointment_id,
        calendar_transferred: !!calendar_id,
        rescheduled: isReschedule,
        status_updated: isStatusUpdate,
        ghl_status: ghlStatus,
        ghl_response: result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-ghl-appointment:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
