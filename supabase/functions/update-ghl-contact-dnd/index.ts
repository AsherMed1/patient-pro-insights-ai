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
    const { ghl_contact_id, ghl_api_key, enable_dnd } = await req.json();

    if (!ghl_contact_id) {
      console.error('Missing ghl_contact_id');
      return new Response(
        JSON.stringify({ error: 'Missing ghl_contact_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      console.error('GHL API key not configured');
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build DND settings for all channels
    const dndStatus = enable_dnd ? 'active' : 'inactive';
    const dndSettings = {
      Call: { status: dndStatus },
      Email: { status: dndStatus },
      SMS: { status: dndStatus },
      WhatsApp: { status: dndStatus },
      GMB: { status: dndStatus },
      FB: { status: dndStatus }
    };

    const updatePayload = {
      dnd: enable_dnd,
      dndSettings
    };

    console.log('Updating GHL contact DND:', { ghl_contact_id, enable_dnd, dndSettings });

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update DND in GoHighLevel',
          details: errorText,
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Successfully updated GHL contact DND:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        contact_id: ghl_contact_id,
        dnd_enabled: enable_dnd
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-ghl-contact-dnd:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
