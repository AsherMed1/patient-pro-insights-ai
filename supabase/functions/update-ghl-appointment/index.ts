import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ghl_appointment_id, ghl_location_id, new_date, new_time, timezone } = await req.json();

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

    const ghlApiKey = Deno.env.get('GHL_LOCATION_API_KEY');
    if (!ghlApiKey) {
      console.error('GHL_LOCATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the new date and time to create ISO 8601 timestamps
    const tz = timezone || 'America/Chicago';
    
    // Combine date and time into a proper datetime string
    const startDateTime = new Date(`${new_date}T${new_time}`);
    
    // Add 30 minutes for end time (default appointment duration)
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

    // Get timezone offset in minutes
    const getTimezoneOffset = (tz: string): string => {
      // Map common US timezones to offsets
      const tzMap: { [key: string]: string } = {
        'America/New_York': '-05:00',
        'America/Chicago': '-06:00',
        'America/Denver': '-07:00',
        'America/Phoenix': '-07:00',
        'America/Los_Angeles': '-08:00',
        'America/Anchorage': '-09:00',
        'America/Honolulu': '-10:00',
        'US/Eastern': '-05:00',
        'US/Central': '-06:00',
        'US/Mountain': '-07:00',
        'US/Pacific': '-08:00',
      };
      
      return tzMap[tz] || '-06:00'; // Default to Central Time
    };

    const tzOffset = getTimezoneOffset(tz);

    // Format as ISO 8601 with timezone
    const formatISO = (date: Date, offset: string): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
    };

    const startTime = formatISO(startDateTime, tzOffset);
    const endTime = formatISO(endDateTime, tzOffset);

    console.log('Updating GHL appointment:', {
      ghl_appointment_id,
      ghl_location_id,
      startTime,
      endTime,
      timezone: tz
    });

    // Call GoHighLevel API to update appointment
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/appointments/${ghl_appointment_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          startTime,
          endTime,
          appointmentStatus: 'confirmed',
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