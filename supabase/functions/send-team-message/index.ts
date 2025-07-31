import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  message: string;
  project_name: string;
  sender_info?: {
    name?: string;
    email?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received team message request');
    
    const { message, project_name, sender_info }: MessageRequest = await req.json();

    // Validate required fields
    if (!message || !project_name) {
      console.error('Missing required fields:', { message: !!message, project_name: !!project_name });
      return new Response(
        JSON.stringify({ error: 'Message and project_name are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      message,
      project_name,
      sender_info,
      timestamp: new Date().toISOString(),
      source: 'project_portal'
    };

    console.log('Sending webhook with payload:', JSON.stringify(webhookPayload, null, 2));

    // Send to Make.com webhook
    const webhookUrl = 'https://hook.us1.make.com/bi2ugenf4kchl6ppml79g4dma88mn9y8';
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send message to team',
          details: `Webhook returned ${webhookResponse.status}: ${webhookResponse.statusText}`
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const webhookResult = await webhookResponse.text();
    console.log('Webhook success:', webhookResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Message sent to appointment team successfully',
        webhook_response: webhookResult
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-team-message function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);