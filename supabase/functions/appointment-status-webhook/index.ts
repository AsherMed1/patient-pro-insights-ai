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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment_id, old_status, new_status }: WebhookRequest = await req.json();

    console.log('Webhook triggered for appointment:', appointment_id, 'Status change:', old_status, '->', new_status);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch complete appointment data
    const { data: appointment, error: fetchError } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (fetchError) {
      console.error('Error fetching appointment:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch appointment data', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointment) {
      console.error('Appointment not found:', appointment_id);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project webhook configuration
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('appointment_webhook_url')
      .eq('project_name', appointment.project_name)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch project configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no webhook URL configured for this project, skip webhook
    if (!project?.appointment_webhook_url) {
      console.log('No webhook URL configured for project:', appointment.project_name);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No webhook configured for this project',
          appointment_id: appointment_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = project.appointment_webhook_url;

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (e) {
      console.error('Invalid webhook URL:', webhookUrl);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook URL configured for project' }),
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

    console.log('Sending webhook payload for appointment:', appointment_id, 'to URL:', webhookUrl);

    // Send to project-specific webhook URL
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook delivery failed:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Webhook delivery failed', 
          status: webhookResponse.status,
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook delivered successfully for appointment:', appointment_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook delivered successfully',
        appointment_id: appointment_id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in appointment-status-webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
