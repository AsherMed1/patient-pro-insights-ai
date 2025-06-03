
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
        JSON.stringify({ 
          error: 'Method not allowed', 
          message: 'Use POST to add appointment data',
          endpoint: 'POST /functions/v1/all-appointments-api'
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the raw body text first for debugging
    const bodyText = await req.text()
    console.log('Raw request body:', bodyText)
    console.log('Content-Type header:', req.headers.get('content-type'))

    // Try to parse JSON with better error handling
    let body
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Body that failed to parse:', bodyText)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON format', 
          message: 'Request body must be valid JSON',
          details: parseError.message,
          receivedBody: bodyText.substring(0, 500) // First 500 chars for debugging
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Parsed appointment data:', body)

    // Validate required fields
    const requiredFields = ['date_appointment_created', 'lead_name', 'project_name']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing: missingFields,
          required: requiredFields
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract time from requested_time if it contains both date and time
    let extractedTime = null
    if (body.requested_time) {
      // Handle both "HH:MM" and "YYYY-MM-DD HH:MM" formats
      const timeMatch = body.requested_time.match(/(\d{2}:\d{2})(?::\d{2})?$/)
      if (timeMatch) {
        extractedTime = timeMatch[1] + ':00' // Ensure HH:MM:SS format
      }
    }

    // Prepare appointment data
    const appointmentData = {
      date_appointment_created: body.date_appointment_created,
      lead_name: body.lead_name,
      project_name: body.project_name,
      date_of_appointment: body.date_of_appointment || null,
      lead_email: body.lead_email || null,
      lead_phone_number: body.lead_phone_number || null,
      calendar_name: body.calendar_name || null,
      requested_time: extractedTime,
      stage_booked: body.stage_booked || null,
      showed: body.showed || false,
      confirmed: body.confirmed || false,
      agent: body.agent || null,
      agent_number: body.agent_number || null,
      ghl_id: body.ghl_id || null,
      confirmed_number: body.confirmed_number || null
    }

    // Check for existing appointment with same ghl_id, date, and time if all are provided
    if (appointmentData.ghl_id && appointmentData.date_of_appointment && appointmentData.requested_time) {
      const { data: existingAppointment } = await supabase
        .from('all_appointments')
        .select('id, lead_name, project_name')
        .eq('ghl_id', appointmentData.ghl_id)
        .eq('date_of_appointment', appointmentData.date_of_appointment)
        .eq('requested_time', appointmentData.requested_time)
        .maybeSingle()

      if (existingAppointment) {
        console.log('Duplicate appointment detected:', existingAppointment)
        return new Response(
          JSON.stringify({ 
            error: 'Duplicate appointment', 
            message: 'An appointment with the same GHL ID, date, and time already exists',
            existing: existingAppointment,
            duplicate_key: {
              ghl_id: appointmentData.ghl_id,
              date_of_appointment: appointmentData.date_of_appointment,
              requested_time: appointmentData.requested_time
            }
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Insert into all_appointments table
    const { data, error } = await supabase
      .from('all_appointments')
      .insert([appointmentData])
      .select()

    if (error) {
      console.error('Database error:', error)
      
      // Handle unique constraint violation specifically
      if (error.code === '23505' && error.message.includes('unique_appointment_ghl_datetime')) {
        return new Response(
          JSON.stringify({ 
            error: 'Duplicate appointment', 
            message: 'An appointment with the same GHL ID, date, and time already exists',
            details: error.message 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully created appointment:', data[0])

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Appointment created successfully',
        data: data[0]
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
