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
    const { ghl_location_id, ghl_api_key } = await req.json();

    if (!ghl_location_id) {
      return new Response(
        JSON.stringify({ error: 'ghl_location_id is required' }),
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

    console.log('Fetching timezone for GHL location:', ghl_location_id);

    // Call GoHighLevel API to get location details
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${ghl_location_id}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Accept': 'application/json',
        },
      }
    );

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('GHL API error:', ghlResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch location from GoHighLevel',
          details: errorText,
          status: ghlResponse.status
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationData = await ghlResponse.json();
    const timezone = locationData.location?.timezone || locationData.timezone;

    if (!timezone) {
      console.warn('No timezone found in GHL response:', locationData);
      return new Response(
        JSON.stringify({ 
          error: 'Timezone not found in GoHighLevel location data',
          locationData 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully fetched timezone:', timezone);

    return new Response(
      JSON.stringify({ 
        timezone,
        location_name: locationData.location?.name || locationData.name,
        location_id: ghl_location_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-ghl-location-timezone:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});