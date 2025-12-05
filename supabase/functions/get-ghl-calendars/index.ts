import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLCalendar {
  id: string;
  name: string;
  isActive: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ghl_location_id, ghl_api_key } = await req.json();

    if (!ghl_location_id) {
      return new Response(
        JSON.stringify({ error: 'Missing ghl_location_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use project-specific API key if provided, otherwise fall back to global key
    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      console.error('No GHL API key available');
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching calendars for location:', ghl_location_id);

    // Fetch calendars from GHL API
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/?locationId=${ghl_location_id}`,
      {
        method: 'GET',
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
          error: 'Failed to fetch calendars from GoHighLevel',
          details: errorText,
          status: ghlResponse.status
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await ghlResponse.json();
    console.log('GHL calendars response:', JSON.stringify(data).substring(0, 500));

    // Extract active calendars
    const calendars: GHLCalendar[] = (data.calendars || [])
      .filter((cal: any) => cal.isActive !== false)
      .map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        isActive: cal.isActive ?? true
      }));

    console.log(`Found ${calendars.length} active calendars`);

    return new Response(
      JSON.stringify({ calendars }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-ghl-calendars:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
