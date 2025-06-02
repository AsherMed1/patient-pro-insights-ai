
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse JSON body
    const body = await req.json()
    
    // Validate required fields
    const { 
      lead_name, 
      lead_phone_number, 
      project_name, 
      date, 
      call_datetime, 
      direction, 
      status,
      duration_seconds = 0,
      agent = null,
      recording_url = null,
      call_summary = null
    } = body

    if (!lead_name || !lead_phone_number || !project_name || !date || !call_datetime || !direction || !status) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields. Required: lead_name, lead_phone_number, project_name, date, call_datetime, direction, status' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate date format
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle call_datetime with proper timezone conversion
    let callDateTimeObj;
    
    console.log('Original call_datetime:', call_datetime);
    
    // Check if the datetime string already has timezone info
    if (call_datetime.includes('Z') || call_datetime.includes('+') || call_datetime.includes('-')) {
      // Already has timezone info, use as-is (no conversion needed)
      callDateTimeObj = new Date(call_datetime);
      console.log('Datetime has timezone info, using as-is');
    } else {
      // No timezone info - assume it's Central Time and convert to UTC
      console.log('No timezone info detected, treating as Central Time');
      
      // Parse the datetime string manually to avoid timezone interpretation issues
      const parts = call_datetime.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
      if (!parts) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00 or 2024-01-15T10:30:00Z)' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      const [, year, month, day, hour, minute, second] = parts;
      
      // Create date in Central Time
      const centralTime = new Date();
      centralTime.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
      centralTime.setHours(parseInt(hour), parseInt(minute), parseInt(second), 0);
      
      // Determine if it's DST
      const dstStart = new Date(parseInt(year), 2, 8); // March 8th as baseline
      dstStart.setDate(dstStart.getDate() + (7 - dstStart.getDay()) % 7); // Second Sunday
      
      const dstEnd = new Date(parseInt(year), 10, 1); // November 1st as baseline  
      dstEnd.setDate(dstEnd.getDate() + (7 - dstEnd.getDay()) % 7); // First Sunday
      
      const isDST = centralTime >= dstStart && centralTime < dstEnd;
      const offsetHours = isDST ? 5 : 6; // CDT is UTC-5, CST is UTC-6
      
      console.log('Is DST:', isDST, 'Offset hours:', offsetHours);
      
      // Convert Central Time to UTC by adding the offset
      callDateTimeObj = new Date(centralTime.getTime() + (offsetHours * 60 * 60 * 1000));
    }

    if (isNaN(callDateTimeObj.getTime())) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00Z or 2024-01-15T10:30:00)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate direction values
    const validDirections = ['inbound', 'outbound']

    if (!validDirections.includes(direction.toLowerCase())) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid direction. Must be one of: ${validDirections.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Final UTC datetime to save:', callDateTimeObj.toISOString());

    // Insert new call record into database
    const { data, error } = await supabase
      .from('all_calls')
      .insert([{
        lead_name,
        lead_phone_number,
        project_name,
        date: dateObj.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        call_datetime: callDateTimeObj.toISOString(),
        direction: direction.toLowerCase(),
        status: status,
        duration_seconds: parseInt(duration_seconds) || 0,
        agent,
        recording_url,
        call_summary
      }])
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create call record', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully saved call record with UTC datetime:', data[0].call_datetime);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call record created successfully',
        data: data[0],
        timezone_note: call_datetime.includes('Z') || call_datetime.includes('+') || call_datetime.includes('-') 
          ? 'Datetime already had timezone info, used as-is' 
          : 'Datetime converted from Central Time to UTC for storage'
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
