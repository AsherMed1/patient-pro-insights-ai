// Diagnostic function to test GoHighLevel API authentication
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testContactId } = await req.json().catch(() => ({}));
    
    // Get API key from environment
    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    
    if (!ghlApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GHL API key not configured in environment',
          diagnostic: 'GOHIGHLEVEL_API_KEY environment variable is missing'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing GHL API authentication...');
    console.log('API Key format check:', {
      keyLength: ghlApiKey.length,
      startsWithSpace: ghlApiKey.startsWith(' '),
      endsWithSpace: ghlApiKey.endsWith(' '),
      firstChars: ghlApiKey.substring(0, 8) + '...',
      lastChars: '...' + ghlApiKey.substring(ghlApiKey.length - 4)
    });

    // Test 1: Try to fetch a specific contact if provided, or just test the endpoint
    const testUrl = testContactId 
      ? `${GHL_BASE_URL}/contacts/${testContactId}`
      : `${GHL_BASE_URL}/contacts/`;
    
    console.log(`Making test request to: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('GHL API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData
    });

    // Return diagnostic information
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseData,
        diagnostic: {
          apiKeyConfigured: true,
          apiKeyLength: ghlApiKey.length,
          apiKeyFormat: ghlApiKey.substring(0, 8) + '...' + ghlApiKey.substring(ghlApiKey.length - 4),
          requestUrl: testUrl,
          requestHeaders: {
            authorization: 'Bearer [REDACTED]',
            version: GHL_API_VERSION,
            contentType: 'application/json'
          },
          advice: response.ok 
            ? 'API key is working correctly!'
            : response.status === 401
            ? 'Authentication failed. Possible issues: 1) Wrong API key type (using OAuth token instead of Private Integration key), 2) API key lacks contacts.readonly permission, 3) API key is for wrong location, 4) API key has been revoked'
            : `Unexpected status code: ${response.status}`
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Diagnostic function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        diagnostic: 'Unexpected error during API test'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
