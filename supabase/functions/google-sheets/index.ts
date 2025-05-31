
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchSheetData(spreadsheetId: string, range: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.values || [];
}

async function fetchSheetMetadata(spreadsheetId: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch sheet metadata: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.sheets?.map((sheet: any) => ({
    title: sheet.properties.title,
    sheetId: sheet.properties.sheetId,
  })) || [];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, range, clientId, action } = await req.json();

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Missing spreadsheetId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Google API Key from Supabase secrets
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google API Key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Handle different actions
    if (action === 'getSheets') {
      // Fetch sheet metadata (tab names)
      const sheets = await fetchSheetMetadata(spreadsheetId, apiKey);
      console.log(`Fetched ${sheets.length} sheet tabs for client ${clientId}`);
      
      return new Response(
        JSON.stringify({ sheets }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Default action: fetch data from a specific range
      if (!range) {
        return new Response(
          JSON.stringify({ error: 'Missing range for data fetch' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const sheetData = await fetchSheetData(spreadsheetId, range, apiKey);
      console.log(`Fetched ${sheetData.length} rows from Google Sheets for client ${clientId}`);

      return new Response(
        JSON.stringify({ data: sheetData }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in Google Sheets function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
