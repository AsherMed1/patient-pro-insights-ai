import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { formatInTimeZone, fromZonedTime } from "npm:date-fns-tz@3.2.0";
import { addMinutes } from "npm:date-fns@3.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ghl_appointment_id, ghl_location_id, new_date, new_time, timezone, ghl_api_key, calendar_id, title } = await req.json();

    // For calendar transfer, only appointment_id and calendar_id are required
    const isCalendarTransfer = calendar_id && !new_date && !new_time;
    
    // Validate required fields based on operation type
    if (!ghl_appointment_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: ghl_appointment_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!isCalendarTransfer && (!new_date || !new_time)) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields for reschedule',
          required: ['ghl_appointment_id', 'new_date', 'new_time'],
          hint: 'For calendar transfer only, provide ghl_appointment_id and calendar_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use project-specific API key if provided, otherwise fall back to global key
    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      console.error('No GHL API key available (neither project-specific nor global)');
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating GHL appointment:', {
      ghl_appointment_id,
      ghl_location_id,
      calendar_id,
      isCalendarTransfer,
      new_date,
      new_time
    });

    // First, fetch the existing appointment to get current data
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
    const assignedUserId = existingAppointment.appointment?.assignedUserId;
    const existingCalendarId = existingAppointment.appointment?.calendarId;
    const existingStartTime = existingAppointment.appointment?.startTime;
    const existingEndTime = existingAppointment.appointment?.endTime;

    if (!assignedUserId) {
      console.error('No assignedUserId found in existing appointment:', existingAppointment);
      return new Response(
        JSON.stringify({ 
          error: 'No assigned user found for this appointment',
          details: 'The appointment must have an assigned team member to be updated'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found existing appointment data:', { assignedUserId, existingCalendarId, existingStartTime });

    // Build the update payload
    let updatePayload: any = {
      assignedUserId,
      toNotify: true,
      ignoreDateRange: true,
      ignoreFreeSlotValidation: true,
    };

    // If calendar transfer, include new calendarId
    if (calendar_id) {
      updatePayload.calendarId = calendar_id;
      console.log('Including calendar transfer to:', calendar_id);
    }

    // If title update is provided
    if (title) {
      updatePayload.title = title;
      console.log('Updating appointment title to:', title);
    }

    // If rescheduling (new date/time provided)
    if (new_date && new_time) {
      const tz = timezone || 'America/Chicago';
      const startDateTimeInTz = fromZonedTime(`${new_date}T${new_time}`, tz);
      const endDateTimeInTz = addMinutes(startDateTimeInTz, 30);
      const startTime = formatInTimeZone(startDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
      const endTime = formatInTimeZone(endDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
      
      updatePayload.startTime = startTime;
      updatePayload.endTime = endTime;
      updatePayload.appointmentStatus = 'confirmed';
      
      console.log('Including reschedule to:', { startTime, endTime });
    } else if (isCalendarTransfer) {
      // For calendar-only transfer, keep existing times
      updatePayload.startTime = existingStartTime;
      updatePayload.endTime = existingEndTime;
      updatePayload.appointmentStatus = 'confirmed';
    }

    // Update the appointment
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
          attempted_update: updatePayload
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
        rescheduled: !!(new_date && new_time),
        ghl_response: result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-ghl-appointment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});