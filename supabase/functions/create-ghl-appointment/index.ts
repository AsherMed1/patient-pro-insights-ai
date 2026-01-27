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

    const notEventCalendarMessage = (typeof ghlData?.message === 'string' ? ghlData.message : '')
      .toLowerCase();
    const isNotEventCalendar = !ghlResponse.ok && notEventCalendarMessage.includes('not an event calendar');

    // For non-event calendars (round-robin, service, etc.), we need to create an appointment
    // with a placeholder contact to properly block the slot on the calendar
    if (isNotEventCalendar) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Calendar is not event type. Using placeholder appointment approach...');

      try {
        // Search for existing placeholder contact
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

        const searchData = await searchResponse.json();
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

          const createContactData = await createContactResponse.json();
          
          if (createContactResponse.ok && createContactData.contact?.id) {
            placeholderContactId = createContactData.contact.id;
            console.log('[CREATE-GHL-BLOCK-SLOT] Created placeholder contact:', placeholderContactId);
          } else {
            console.error('[CREATE-GHL-BLOCK-SLOT] Failed to create placeholder contact:', createContactData);
          }
        }

        if (placeholderContactId) {
          // Create appointment on the specific calendar with the placeholder contact
          // This blocks the slot on the actual calendar, not just user calendars
          const appointmentPayload = {
            calendarId: calendar_id,
            locationId: project.ghl_location_id,
            contactId: placeholderContactId,
            title: title || 'Reserved',
            startTime: start_time,
            endTime: end_time,
            appointmentStatus: 'confirmed',
            toNotify: false,
            ignoreDateRange: true,
            ignoreAvailability: true,
          };

          console.log('[CREATE-GHL-BLOCK-SLOT] Creating appointment on calendar:', appointmentPayload);

          const appointmentResponse = await fetch(
            'https://services.leadconnectorhq.com/calendars/events/appointments',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${project.ghl_api_key}`,
                'Version': '2021-04-15',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(appointmentPayload),
            }
          );

          const appointmentData = await appointmentResponse.json();

          if (appointmentResponse.ok && (appointmentData.id || appointmentData.appointmentId)) {
            console.log('[CREATE-GHL-BLOCK-SLOT] Appointment created successfully:', appointmentData);

            return new Response(
              JSON.stringify({
                success: true,
                ghl_appointment_id: appointmentData.id || appointmentData.appointmentId,
                all_block_ids: [appointmentData.id || appointmentData.appointmentId],
                team_members_blocked: 1,
                method: 'placeholder_appointment',
                ghl_data: appointmentData
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            console.error('[CREATE-GHL-BLOCK-SLOT] Failed to create appointment:', appointmentData);
          }
        }
      } catch (e) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Error in placeholder appointment approach:', e);
      }
    }

    // If block-slots succeeded on first try (event calendar), return success
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

    // Fallback: Use placeholder contact approach for calendars that don't support block-slots
    console.log('[CREATE-GHL-BLOCK-SLOT] Block-slots failed, using placeholder contact approach...');

    // Search for existing placeholder contact
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

    const searchData = await searchResponse.json();
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
            email: `reserved-block-${project.ghl_location_id}@placeholder.local`,
            tags: ['system', 'time-block', 'do-not-contact'],
          }),
        }
      );

      const createContactData = await createContactResponse.json();
      
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

    // Now create appointment with the placeholder contact
    const appointmentPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      contactId: placeholderContactId,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
      appointmentStatus: 'confirmed',
      toNotify: false,
      ignoreDateRange: true,
      ignoreAvailability: true,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Creating appointment with placeholder contact:', appointmentPayload);

    ghlResponse = await fetch(
      'https://services.leadconnectorhq.com/calendars/events/appointments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      }
    );

    ghlData = await ghlResponse.json();

    if (!ghlResponse.ok) {
      console.error('[CREATE-GHL-BLOCK-SLOT] GHL API error:', ghlData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create GHL block slot',
          details: ghlData 
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-GHL-BLOCK-SLOT] Placeholder appointment created successfully:', ghlData);

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
