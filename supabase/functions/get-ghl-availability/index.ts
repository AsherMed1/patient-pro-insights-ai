import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendarId, date, timezone, ghl_api_key } = await req.json();

    if (!calendarId || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing calendarId or date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tz = timezone || 'America/Chicago';
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    const url = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&timezone=${encodeURIComponent(tz)}`;

    console.log('Fetching GHL availability:', url);

    const ghlResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-04-15',
        'Accept': 'application/json',
      },
    });

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text();
      console.error('GHL free-slots API error:', ghlResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch availability', details: errorText, status: ghlResponse.status }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await ghlResponse.json();
    console.log('GHL free-slots response:', JSON.stringify(data).substring(0, 500));

    // The API returns { [date]: { slots: [{ slot: "2026-03-09T09:00:00-06:00" }, ...] } }
    // We need to extract just the time portions
    const dateKey = Object.keys(data)?.[0];
    const rawSlots = dateKey ? (data[dateKey]?.slots || []) : [];
    
    const slots: string[] = rawSlots.map((s: any) => {
      const slotTime = s.slot || s;
      // Parse the ISO string and extract HH:mm in the given timezone
      const d = new Date(slotTime);
      // Format in the requested timezone
      const formatted = d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false, 
        timeZone: tz 
      });
      return formatted;
    });

    return new Response(
      JSON.stringify({ slots }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-ghl-availability:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
