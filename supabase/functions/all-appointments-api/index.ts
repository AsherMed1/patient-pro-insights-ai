
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

    // Helper function to format webhook payload as patient intake notes
    const formatWebhookPayload = (body) => {
      // If the body contains a pre-formatted intake note, use it
      if (body.patient_intake_notes) {
        return body.patient_intake_notes;
      }
      
      // If the body contains detailed structured data, format it
      let formattedNotes = '';
      
      // Contact Information
      if (body.lead_name || body.lead_phone_number || body.lead_email || body.ghl_id) {
        formattedNotes += 'Contact: ';
        if (body.lead_name) formattedNotes += `Name: ${body.lead_name}`;
        if (body.lead_phone_number) formattedNotes += `, Phone: ${body.lead_phone_number}`;
        if (body.lead_email) formattedNotes += `, Email: ${body.lead_email}`;
        if (body.ghl_id) formattedNotes += `, Patient ID: ${body.ghl_id}`;
        formattedNotes += ' /n ';
      }
      
      // Insurance Information
      if (body.insurance_provider || body.insurance_plan || body.insurance_id || body.group_number) {
        formattedNotes += 'Insurance: ';
        if (body.insurance_plan) formattedNotes += `Plan: ${body.insurance_plan}`;
        if (body.insurance_provider) formattedNotes += `, Alt Selection: ${body.insurance_provider}`;
        if (body.insurance_id) formattedNotes += `, ID: ${body.insurance_id}`;
        if (body.group_number) formattedNotes += `, Group: ${body.group_number}`;
        formattedNotes += ' /n ';
      }
      
      // Pathology Information
      const hasPathology = body.pain_severity_scale || body.symptoms_description || body.treatments_tried || 
                          body.pain_duration || body.diagnosis || body.trauma_onset || body.imaging_done;
                          
      if (hasPathology) {
        formattedNotes += 'Pathology: ';
        if (body.pain_duration) formattedNotes += `Duration: ${body.pain_duration}`;
        if (body.diagnosis) formattedNotes += `, Diagnosis: ${body.diagnosis}`;
        if (body.trauma_onset !== undefined) formattedNotes += `, Trauma-related Onset: ${body.trauma_onset ? 'YES' : 'NO'}`;
        if (body.pain_severity_scale) formattedNotes += `, Pain Level: ${body.pain_severity_scale}`;
        if (body.symptoms_description) formattedNotes += `, Symptoms: ${body.symptoms_description}`;
        if (body.treatments_tried) formattedNotes += `, Treatments Tried: ${body.treatments_tried}`;
        if (body.imaging_done !== undefined) formattedNotes += `, Imaging Done: ${body.imaging_done ? 'YES' : 'NO'}`;
        formattedNotes += ' /n ';
      }
      
      // Additional Notes
      if (body.notes || body.additional_notes) {
        formattedNotes += `Notes: ${body.notes || body.additional_notes}`;
      }
      
      return formattedNotes || null;
    };

    // Prepare appointment data
    const appointmentData = {
      date_appointment_created: body.date_appointment_created,
      lead_name: body.lead_name,
      project_name: body.project_name,
      date_of_appointment: body.date_of_appointment || null,
      lead_email: body.lead_email || null,
      lead_phone_number: body.lead_phone_number || null,
      calendar_name: body.calendar_name || null,
      requested_time: body.requested_time || null,
      stage_booked: body.stage_booked || null,
      agent: body.agent || null,
      agent_number: body.agent_number || null,
      ghl_id: body.ghl_id || null,
      ghl_appointment_id: body.ghl_appointment_id || null,
      confirmed_number: body.confirmed_number || null,
      status: body.status || null,
      patient_intake_notes: formatWebhookPayload(body)
    }

    // Check if appointment already exists
    const { data: existingAppointment } = await supabase
      .from('all_appointments')
      .select('id')
      .eq('ghl_id', appointmentData.ghl_id)
      .eq('date_of_appointment', appointmentData.date_of_appointment)
      .eq('requested_time', appointmentData.requested_time)
      .maybeSingle()

    const isUpdate = !!existingAppointment

    // Upsert appointment data - insert new or update existing
    const { data, error } = await supabase
      .from('all_appointments')
      .upsert([appointmentData], {
        onConflict: 'ghl_id,date_of_appointment,requested_time'
      })
      .select()

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

    console.log(`Successfully ${isUpdate ? 'updated' : 'created'} appointment:`, data[0])

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Appointment ${isUpdate ? 'updated' : 'created'} successfully`,
        data: data[0],
        operation: isUpdate ? 'update' : 'create'
      }),
      { 
        status: isUpdate ? 200 : 201, 
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
