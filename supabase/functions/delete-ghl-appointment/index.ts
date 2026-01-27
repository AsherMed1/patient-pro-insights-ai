import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAppointmentRequest {
  project_name: string;
  ghl_appointment_id: string;
  is_block_slot?: boolean;
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

    const body: DeleteAppointmentRequest = await req.json();
    const { project_name, ghl_appointment_id, is_block_slot } = body;

    console.log('[DELETE-GHL-APPOINTMENT] Request received:', {
      project_name,
      ghl_appointment_id,
      is_block_slot
    });

    // Validate required fields
    if (!project_name || !ghl_appointment_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: project_name, ghl_appointment_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project to get GHL credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ghl_location_id, ghl_api_key')
      .eq('project_name', project_name)
      .single();

    if (projectError || !project) {
      console.error('[DELETE-GHL-APPOINTMENT] Project not found:', projectError);
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.ghl_api_key) {
      console.error('[DELETE-GHL-APPOINTMENT] Project missing GHL API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Project is not configured for GHL integration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For reserved blocks created as appointments (placeholder contact approach),
    // we use the appointments endpoint. Try appointments first, then block-slots as fallback.
    const endpoints = [
      `https://services.leadconnectorhq.com/calendars/events/appointments/${ghl_appointment_id}`,
      `https://services.leadconnectorhq.com/calendars/events/block-slots/${ghl_appointment_id}`
    ];

    // If explicitly a block slot, try block-slots first (but still fallback to appointments)
    const endpointsToTry = is_block_slot ? endpoints.reverse() : endpoints;

    console.log('[DELETE-GHL-APPOINTMENT] Attempting to delete:', ghl_appointment_id);

    let lastError: string | null = null;
    let success = false;

    for (const endpoint of endpointsToTry) {
      console.log('[DELETE-GHL-APPOINTMENT] Trying endpoint:', endpoint);
      
      const ghlResponse = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
        },
      });

      // GHL returns 200 or 204 on success, or 404 if already deleted
      if (ghlResponse.ok || ghlResponse.status === 204 || ghlResponse.status === 404) {
        console.log('[DELETE-GHL-APPOINTMENT] Successfully deleted via:', endpoint);
        success = true;
        break;
      }

      const responseText = await ghlResponse.text();
      console.log('[DELETE-GHL-APPOINTMENT] Endpoint failed:', endpoint, 'Status:', ghlResponse.status, 'Response:', responseText);
      lastError = responseText;
    }

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'GHL appointment/block deleted'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('[DELETE-GHL-APPOINTMENT] All endpoints failed. Last error:', lastError);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to delete GHL appointment/block',
        details: lastError 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DELETE-GHL-APPOINTMENT] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
