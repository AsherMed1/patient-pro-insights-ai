import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAppointmentRequest {
  project_name: string;
  calendar_id: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  title: string;
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

    const body: CreateAppointmentRequest = await req.json();
    const { project_name, calendar_id, start_time, end_time, title, reason } = body;

    console.log('[CREATE-GHL-APPOINTMENT] Request received:', {
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
      console.error('[CREATE-GHL-APPOINTMENT] Project not found:', projectError);
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.ghl_location_id || !project.ghl_api_key) {
      console.error('[CREATE-GHL-APPOINTMENT] Project missing GHL credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Project is not configured for GHL integration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create appointment in GHL
    const ghlPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
      appointmentStatus: 'confirmed',
      toNotify: false,
      // No contactId - this blocks the slot without associating a patient
    };

    console.log('[CREATE-GHL-APPOINTMENT] Creating GHL appointment:', ghlPayload);

    const ghlResponse = await fetch(
      'https://services.leadconnectorhq.com/calendars/events/appointments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ghlPayload),
      }
    );

    const ghlData = await ghlResponse.json();

    if (!ghlResponse.ok) {
      console.error('[CREATE-GHL-APPOINTMENT] GHL API error:', ghlData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create GHL appointment',
          details: ghlData 
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-GHL-APPOINTMENT] GHL appointment created:', ghlData);

    // Return the GHL appointment ID for local record creation
    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: ghlData.id || ghlData.appointmentId,
        ghl_data: ghlData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-GHL-APPOINTMENT] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
