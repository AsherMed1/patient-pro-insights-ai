import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookRequest {
  appointment_id: string;
  old_status: string | null;
  new_status: string;
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] ${timestamp} - Webhook request received`)
    
    const body = await req.json();
    const { appointment_id, old_status, new_status } = body as WebhookRequest;

    console.log(`[${requestId}] Webhook triggered for appointment:`, appointment_id)
    console.log(`[${requestId}] Status change:`, old_status, '->', new_status)
    console.log(`[${requestId}] Request body:`, JSON.stringify(body, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch complete appointment data
    console.log(`[${requestId}] Fetching appointment data for ID:`, appointment_id)
    
    const { data: appointment, error: fetchError } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (fetchError) {
      console.error(`[${requestId}] Error fetching appointment:`, fetchError)
      console.error(`[${requestId}] Error details:`, JSON.stringify(fetchError, null, 2))
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch appointment data', 
          details: fetchError.message,
          requestId: requestId 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointment) {
      console.error(`[${requestId}] Appointment not found:`, appointment_id)
      return new Response(
        JSON.stringify({ 
          error: 'Appointment not found',
          requestId: requestId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[${requestId}] Appointment found:`, appointment.lead_name, 'Project:', appointment.project_name)

    // Fetch project webhook configuration
    console.log(`[${requestId}] Fetching project configuration for:`, appointment.project_name)
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('appointment_webhook_url')
      .eq('project_name', appointment.project_name)
      .single();

    if (projectError) {
      console.error(`[${requestId}] Error fetching project:`, projectError)
      console.error(`[${requestId}] Project error details:`, JSON.stringify(projectError, null, 2))
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch project configuration',
          requestId: requestId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no webhook URL configured for this project, skip webhook
    if (!project?.appointment_webhook_url) {
      console.log(`[${requestId}] No webhook URL configured for project:`, appointment.project_name)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No webhook configured for this project',
          appointment_id: appointment_id,
          requestId: requestId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = project.appointment_webhook_url;
    console.log(`[${requestId}] Webhook URL found:`, webhookUrl)

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Invalid URL format'
      console.error(`[${requestId}] Invalid webhook URL:`, webhookUrl, errorMsg)
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook URL configured for project',
          requestId: requestId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct comprehensive webhook payload
    const webhookPayload = {
      event: 'appointment_status_changed',
      timestamp: new Date().toISOString(),
      old_status: old_status,
      new_status: new_status,
      appointment: {
        id: appointment.id,
        project_name: appointment.project_name,
        lead_name: appointment.lead_name,
        lead_email: appointment.lead_email,
        lead_phone_number: appointment.lead_phone_number,
        dob: appointment.dob,
        date_appointment_created: appointment.date_appointment_created,
        date_of_appointment: appointment.date_of_appointment,
        requested_time: appointment.requested_time,
        calendar_name: appointment.calendar_name,
        stage_booked: appointment.stage_booked,
        agent: appointment.agent,
        agent_number: appointment.agent_number,
        confirmed_number: appointment.confirmed_number,
        status: appointment.status,
        procedure_ordered: appointment.procedure_ordered,
        internal_process_complete: appointment.internal_process_complete,
        was_ever_confirmed: appointment.was_ever_confirmed,
        ghl_id: appointment.ghl_id,
        ghl_appointment_id: appointment.ghl_appointment_id,
        patient_intake_notes: appointment.patient_intake_notes,
        ai_summary: appointment.ai_summary,
        detected_insurance_provider: appointment.detected_insurance_provider,
        detected_insurance_plan: appointment.detected_insurance_plan,
        detected_insurance_id: appointment.detected_insurance_id,
        insurance_id_link: appointment.insurance_id_link,
        insurance_detection_confidence: appointment.insurance_detection_confidence,
        parsed_insurance_info: appointment.parsed_insurance_info,
        parsed_pathology_info: appointment.parsed_pathology_info,
        parsed_contact_info: appointment.parsed_contact_info,
        parsed_demographics: appointment.parsed_demographics,
        parsing_completed_at: appointment.parsing_completed_at,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at
      }
    };

    console.log(`[${requestId}] Sending webhook payload to:`, webhookUrl)
    console.log(`[${requestId}] Payload size:`, JSON.stringify(webhookPayload).length, 'bytes')

    // Send to project-specific webhook URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId)
      
      console.log(`[${requestId}] Webhook response status:`, webhookResponse.status)

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error(`[${requestId}] Webhook delivery failed with status ${webhookResponse.status}:`, errorText)
        
        return new Response(
          JSON.stringify({ 
            error: 'Webhook delivery failed', 
            status: webhookResponse.status,
            details: errorText,
            requestId: requestId
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] Webhook delivered successfully for appointment:`, appointment_id)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      console.error(`[${requestId}] Webhook fetch error:`, errorMsg)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[${requestId}] Webhook request timed out after 30 seconds`)
        return new Response(
          JSON.stringify({ 
            error: 'Webhook request timeout', 
            message: 'Webhook endpoint did not respond within 30 seconds',
            requestId: requestId
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError // Re-throw to be caught by outer catch
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook delivered successfully',
        appointment_id: appointment_id,
        requestId: requestId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[${requestId}] Error in appointment-status-webhook:`, errorMessage)
    console.error(`[${requestId}] Error stack:`, errorStack)
    console.error(`[${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error,
        requestId: requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
