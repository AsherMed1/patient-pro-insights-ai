
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

    // Validate call_datetime format
    const callDateTimeObj = new Date(call_datetime)
    if (isNaN(callDateTimeObj.getTime())) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00Z)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate direction and status values
    const validDirections = ['inbound', 'outbound']
    const validStatuses = ['answered', 'missed', 'voicemail', 'busy', 'failed', 'no-answer']

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

    if (!validStatuses.includes(status.toLowerCase())) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
        status: status.toLowerCase(),
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

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call record created successfully',
        data: data[0]
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
