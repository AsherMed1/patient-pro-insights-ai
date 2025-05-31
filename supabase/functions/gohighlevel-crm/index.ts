
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchGoHighLevelData(endpoint: string, apiKey: string) {
  const baseUrl = 'https://services.leadconnectorhq.com';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`Fetching GoHighLevel data from: ${url}`);
  console.log(`Using API Key (first 20 chars): ${apiKey.substring(0, 20)}...`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      'Accept': 'application/json'
    }
  });

  console.log(`GoHighLevel API Response Status: ${response.status}`);
  console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GoHighLevel API Error:`, {
      status: response.status,
      statusText: response.statusText,
      url: url,
      errorResponse: errorText,
      headers: Object.fromEntries(response.headers.entries())
    });
    throw new Error(`Failed to fetch GoHighLevel data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Successfully fetched GoHighLevel data from ${endpoint}`, { 
    dataKeys: Object.keys(data),
    dataLength: Array.isArray(data) ? data.length : 'not array'
  });
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
        // Try the v2 API endpoint first
        try {
          data = await fetchGoHighLevelData(`/contacts/?locationId=${locationId}&limit=100`, apiKey);
        } catch (error) {
          console.log('V2 API failed, trying alternative endpoint');
          // Fallback to alternative endpoint format
          data = await fetchGoHighLevelData(`/contacts?locationId=${locationId}&limit=100`, apiKey);
        }
        break;
      
      case 'getOpportunities':
        try {
          data = await fetchGoHighLevelData(`/opportunities/search?location_id=${locationId}&limit=100`, apiKey);
        } catch (error) {
          console.log('Opportunities search failed, trying alternative');
          data = await fetchGoHighLevelData(`/opportunities?locationId=${locationId}&limit=100`, apiKey);
        }
        break;
      
      case 'getPipelines':
        data = await fetchGoHighLevelData(`/opportunities/pipelines?locationId=${locationId}`, apiKey);
        break;
      
      case 'getLocation':
        data = await fetchGoHighLevelData(`/locations/${locationId}`, apiKey);
        break;

      case 'testConnection':
        // Simple test to verify API access
        try {
          data = await fetchGoHighLevelData(`/locations/${locationId}`, apiKey);
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Connection successful',
              locationData: data
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: error.message,
              message: 'Connection failed'
            }),
            { 
              status: 200, // Return 200 to avoid triggering error handlers
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
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
