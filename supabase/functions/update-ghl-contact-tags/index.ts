import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Adds or removes tags on a GHL contact.
// Body: { ghl_contact_id, ghl_api_key?, tags: string[], action: 'add' | 'remove' }
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ghl_contact_id, ghl_api_key, tags, action } = await req.json();

    if (!ghl_contact_id) {
      return new Response(
        JSON.stringify({ error: 'Missing ghl_contact_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tags must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const op = action === 'remove' ? 'remove' : 'add';
    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/tags`;
    const method = op === 'add' ? 'POST' : 'DELETE';

    console.log(`GHL contact tags ${op}:`, { ghl_contact_id, tags });

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL tags API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to update GHL contact tags', details: errorText, status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json().catch(() => ({}));
    console.log('GHL tags update success:', result);

    return new Response(
      JSON.stringify({ success: true, contact_id: ghl_contact_id, action: op, tags }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-ghl-contact-tags:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
