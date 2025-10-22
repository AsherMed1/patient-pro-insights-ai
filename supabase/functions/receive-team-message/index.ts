import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InboundMessagePayload {
  message: string;
  project_name: string;
  sender_name?: string;
  sender_email?: string;
  sender_type?: 'team' | 'system' | 'agent';
  patient_reference?: {
    name?: string;
    phone?: string;
    contact_id?: string;
    email?: string;
  };
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received inbound message request');
    
    const payload: InboundMessagePayload = await req.json();
    const { message, project_name, sender_name, sender_email, sender_type, patient_reference, metadata } = payload;

    // Validate required fields
    if (!message || !project_name) {
      console.error('Missing required fields:', { message: !!message, project_name: !!project_name });
      return new Response(
        JSON.stringify({ error: 'message and project_name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('project_name', project_name)
      .eq('active', true)
      .single();

    if (projectError || !project) {
      console.error('Project not found or inactive:', project_name);
      return new Response(
        JSON.stringify({ error: 'Project not found or inactive' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Storing inbound message for project:', project_name);

    // Store inbound message
    const { data: messageRecord, error: insertError } = await supabase
      .from('project_messages')
      .insert({
        project_name,
        message,
        direction: 'inbound',
        sender_type: sender_type || 'team',
        sender_name,
        sender_email,
        patient_reference,
        metadata: {
          ...metadata,
          received_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store inbound message:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store message', 
          details: insertError.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Inbound message stored successfully:', messageRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: messageRecord.id,
        message: 'Message received and stored successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error processing inbound message:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
