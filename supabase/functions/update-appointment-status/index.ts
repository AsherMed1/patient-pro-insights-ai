
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

    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed', 
          message: 'Use PUT or PATCH to update appointment status',
          endpoint: 'PUT/PATCH /functions/v1/update-appointment-status'
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

    console.log('Parsed appointment update data:', body)

    // Validate required fields - need either id or combination of identifiers
    if (!body.id && !body.ghl_appointment_id && !body.ghl_id && !body.lead_phone_number && !body.lead_name) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required identifier', 
          message: 'Must provide one of: "id", "ghl_appointment_id", "ghl_id", "lead_phone_number", or "lead_name" to identify the appointment',
          example: {
            ghl_appointment_id: 'ghl_appointment_id_123',
            // OR
            ghl_id: 'ghl_contact_id_456',
            // OR
            lead_phone_number: '+1234567890',
            // OR
            lead_name: 'John Doe',
            // OR
            id: 'uuid-of-appointment'
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build the update data object with only valid fields
    const updateData: any = {}
    
    // Status normalization mapping for case-insensitive input
    const statusNormalization: Record<string, string> = {
      'confirmed': 'Confirmed',
      'cancelled': 'Cancelled', 
      'canceled': 'Cancelled', // Handle both spellings
      'no show': 'No Show',
      'noshow': 'No Show',
      'showed': 'Showed',
      'attended': 'Showed', // Alternative for showed
      'pending': 'Pending'
    }
    
    // Allow updating these status fields (removed showed/confirmed as they're not needed)
    if (body.agent !== undefined) updateData.agent = body.agent
    if (body.agent_number !== undefined) updateData.agent_number = body.agent_number
    if (body.confirmed_number !== undefined) updateData.confirmed_number = body.confirmed_number
    if (body.stage_booked !== undefined) updateData.stage_booked = body.stage_booked
    if (body.date_of_appointment !== undefined) updateData.date_of_appointment = body.date_of_appointment
    if (body.requested_time !== undefined) updateData.requested_time = body.requested_time
    if (body.status !== undefined) {
      // Normalize status to proper capitalization
      const normalizedStatus = statusNormalization[body.status.toLowerCase()] || body.status
      updateData.status = normalizedStatus
      console.log(`Status normalized: "${body.status}" -> "${normalizedStatus}"`)
    }
    if (body.procedure_ordered !== undefined) updateData.procedure_ordered = body.procedure_ordered

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    if (Object.keys(updateData).length <= 1) { // Only updated_at
      return new Response(
        JSON.stringify({ 
          error: 'No valid fields to update', 
          message: 'Please provide at least one valid field to update',
          validFields: ['agent', 'agent_number', 'confirmed_number', 'stage_booked', 'date_of_appointment', 'requested_time', 'status', 'procedure_ordered']
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build the query based on available identifier - Priority order: ghl_appointment_id, ghl_id, lead_phone_number, then others
    let updateQuery = supabase.from('all_appointments').update(updateData)

    if (body.ghl_appointment_id) {
      updateQuery = updateQuery.eq('appointment_id', body.ghl_appointment_id)
    } else if (body.ghl_id) {
      updateQuery = updateQuery.eq('ghl_id', body.ghl_id)
    } else if (body.lead_phone_number) {
      updateQuery = updateQuery.eq('lead_phone_number', body.lead_phone_number)
    } else if (body.id) {
      updateQuery = updateQuery.eq('id', body.id)
    } else if (body.lead_name) {
      updateQuery = updateQuery.eq('lead_name', body.lead_name)
      // Optionally filter by project_name if provided for more precision
      if (body.project_name) {
        updateQuery = updateQuery.eq('project_name', body.project_name)
      }
    }

    // Execute the update query
    const { data, error } = await updateQuery.select()

    if (error) {
      console.error('Database error:', error)
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

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Appointment not found', 
          message: 'No appointment found with the provided identifier'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully updated appointment:', data[0])

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Appointment status updated successfully',
        data: data[0],
        updated_fields: Object.keys(updateData).filter(key => key !== 'updated_at')
      }),
      { 
        status: 200, 
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
