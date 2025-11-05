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
    const { ghl_appointment_id, ghl_location_id, new_date, new_time, timezone, ghl_api_key } = await req.json();

    // Validate required fields
    if (!ghl_appointment_id || !new_date || !new_time) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['ghl_appointment_id', 'new_date', 'new_time']
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

    // Parse the new date and time to create ISO 8601 timestamps
    const tz = timezone || 'America/Chicago';
    
    // Properly parse the input as Central Time (or specified timezone)
    // This converts "2025-12-01T17:00" in Central Time to a UTC Date object
    const startDateTimeInTz = fromZonedTime(`${new_date}T${new_time}`, tz);
    
    // Add 30 minutes for end time (default appointment duration)
    const endDateTimeInTz = addMinutes(startDateTimeInTz, 30);

    // Format as ISO 8601 with the timezone offset (this properly handles DST)
    const startTime = formatInTimeZone(startDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const endTime = formatInTimeZone(endDateTimeInTz, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");

    console.log('Updating GHL appointment:', {
      ghl_appointment_id,
      ghl_location_id,
      startTime,
      endTime,
      timezone: tz
    });

    // First, fetch the existing appointment to get the assignedUserId
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

    if (!assignedUserId) {
      console.error('No assignedUserId found in existing appointment:', existingAppointment);
      return new Response(
        JSON.stringify({ 
          error: 'No assigned user found for this appointment',
          details: 'The appointment must have an assigned team member to be rescheduled'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found assignedUserId:', assignedUserId);

    // Now update the appointment with the new times and the existing assignedUserId
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
        body: JSON.stringify({
          startTime,
          endTime,
          appointmentStatus: 'confirmed',
          assignedUserId,
          toNotify: true,
          ignoreDateRange: true,
          ignoreFreeSlotValidation: true,
        }),
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
          attempted_times: { startTime, endTime }
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
        updated_times: { startTime, endTime },
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