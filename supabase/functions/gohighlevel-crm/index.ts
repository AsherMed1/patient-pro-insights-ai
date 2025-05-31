
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchGoHighLevelData(endpoint: string, apiKey: string) {
  const baseUrl = 'https://services.leadconnectorhq.com';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`Fetching GoHighLevel data from: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  });

  console.log(`GoHighLevel API Response Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GoHighLevel API Error:`, {
      status: response.status,
      statusText: response.statusText,
      url: url,
      errorResponse: errorText
    });
    throw new Error(`Failed to fetch GoHighLevel data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Successfully fetched GoHighLevel data from ${endpoint}`, { dataKeys: Object.keys(data) });
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, locationId } = await req.json();

    console.log(`Processing GoHighLevel request:`, {
      action,
      locationId,
      timestamp: new Date().toISOString()
    });

    // Get GoHighLevel API Key from Supabase secrets
    const apiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!apiKey) {
      console.error('GoHighLevel API Key not found in environment');
      return new Response(
        JSON.stringify({ error: 'GoHighLevel API Key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('GoHighLevel API Key found, proceeding with request');
    
    let data;
    
    switch (action) {
      case 'getContacts':
        data = await fetchGoHighLevelData(`/contacts/?locationId=${locationId}&limit=100`, apiKey);
        break;
      
      case 'getOpportunities':
        data = await fetchGoHighLevelData(`/opportunities/search?location_id=${locationId}&limit=100`, apiKey);
        break;
      
      case 'getPipelines':
        data = await fetchGoHighLevelData(`/opportunities/pipelines?locationId=${locationId}`, apiKey);
        break;
      
      case 'getLocation':
        data = await fetchGoHighLevelData(`/locations/${locationId}`, apiKey);
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action specified' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    console.log(`Returning GoHighLevel data for action: ${action}`, { hasData: !!data });

    return new Response(
      JSON.stringify({ 
        data,
        success: true,
        action,
        locationId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in GoHighLevel function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
