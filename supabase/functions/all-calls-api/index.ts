
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateRequiredFields, validateDate, validateDirection, type ValidationError } from './validation.ts';
import { convertCallDateTimeToUTC } from './timezone-utils.ts';
import { createCallRecord } from './database.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse JSON body
    const body = await req.json();
    
    // Validate required fields
    const validationResult = validateRequiredFields(body);
    if ('error' in validationResult) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { 
          status: validationResult.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validatedData = validationResult;

    // Validate date format
    const dateError = validateDate(validatedData.date);
    if (dateError) {
      return new Response(
        JSON.stringify({ error: dateError.error }),
        { 
          status: dateError.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle call_datetime conversion
    let timezoneResult;
    try {
      timezoneResult = convertCallDateTimeToUTC(validatedData.call_datetime);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate direction values
    const directionError = validateDirection(validatedData.direction);
    if (directionError) {
      return new Response(
        JSON.stringify({ error: directionError.error }),
        { 
          status: directionError.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create call record in database
    let callRecord;
    try {
      callRecord = await createCallRecord(validatedData, timezoneResult.dateTime);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call record created successfully',
        data: callRecord,
        timezone_note: timezoneResult.note
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
