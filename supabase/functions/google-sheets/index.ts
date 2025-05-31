
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchSheetData(spreadsheetId: string, range: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
  console.log(`Fetching data from: ${url}`);
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API Error:`, {
      status: response.status,
      statusText: response.statusText,
      url: url,
      errorResponse: errorText
    });
    throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`Successfully fetched ${data.values?.length || 0} rows from ${spreadsheetId}`);
  return data.values || [];
}

async function fetchSheetMetadata(spreadsheetId: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
  
  console.log(`Fetching metadata from: ${url}`);
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets Metadata API Error:`, {
      status: response.status,
      statusText: response.statusText,
      url: url,
      errorResponse: errorText,
      spreadsheetId: spreadsheetId
    });
    throw new Error(`Failed to fetch sheet metadata: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const sheets = data.sheets?.map((sheet: any) => ({
    title: sheet.properties.title,
    sheetId: sheet.properties.sheetId,
  })) || [];
  
  console.log(`Successfully fetched metadata for ${spreadsheetId}:`, {
    title: data.properties?.title,
    sheetCount: sheets.length,
    sheets: sheets.map(s => s.title)
  });
  
  return sheets;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, range, clientId, action } = await req.json();

    console.log(`Processing request:`, {
      spreadsheetId,
      range,
      clientId,
      action,
      timestamp: new Date().toISOString()
    });

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
      console.error('Google API Key not found in environment');
      return new Response(
        JSON.stringify({ error: 'Google API Key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Google API Key found, proceeding with request');
    
    // Handle different actions
    if (action === 'getSheets') {
      // Fetch sheet metadata (tab names)
      const sheets = await fetchSheetMetadata(spreadsheetId, apiKey);
      console.log(`Returning ${sheets.length} sheet tabs for client ${clientId}`);
      
      return new Response(
        JSON.stringify({ 
          sheets,
          success: true,
          clientId,
          spreadsheetId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (action === 'testConnection') {
      // Test connection to verify permissions
      try {
        const sheets = await fetchSheetMetadata(spreadsheetId, apiKey);
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Connection successful',
            sheetCount: sheets.length,
            sheets: sheets.map(s => s.title),
            clientId,
            spreadsheetId
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
            clientId,
            spreadsheetId
          }),
          { 
            status: 200, // Return 200 so we can see the error details
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
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
      console.log(`Returning ${sheetData.length} rows from Google Sheets for client ${clientId}`);

      return new Response(
        JSON.stringify({ 
          data: sheetData,
          success: true,
          clientId,
          spreadsheetId,
          range
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in Google Sheets function:', error);
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
