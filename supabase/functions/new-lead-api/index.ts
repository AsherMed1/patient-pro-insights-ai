
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
    const { lead_name, project_name, date, times_called = 0 } = body

    if (!lead_name || !project_name || !date) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields. Required: lead_name, project_name, date' 
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

    // Validate pain severity scale if provided
    if (body.pain_severity_scale !== undefined && body.pain_severity_scale !== null) {
      const painScale = parseInt(body.pain_severity_scale)
      if (isNaN(painScale) || painScale < 1 || painScale > 10) {
        return new Response(
          JSON.stringify({ 
            error: 'Pain severity scale must be between 1 and 10' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Check if project exists, if not create it
    const { data: existingProject, error: projectCheckError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_name', project_name)
      .maybeSingle()

    if (projectCheckError && projectCheckError.code !== 'PGRST116') {
      console.error('Error checking project:', projectCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check project', details: projectCheckError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If project doesn't exist, create it
    if (!existingProject) {
      const { error: projectInsertError } = await supabase
        .from('projects')
        .insert([{ project_name }])

      if (projectInsertError) {
        console.error('Error creating project:', projectInsertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create project', details: projectInsertError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      console.log('Created new project:', project_name)
    }

    // Prepare the lead data with all possible fields
    const leadData = {
      lead_name,
      project_name,
      date: dateObj.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
      times_called: parseInt(times_called) || 0,
      // Optional fields
      contact_id: body.contact_id || null,
      appt_date: body.appt_date ? new Date(body.appt_date).toISOString().split('T')[0] : null,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      dob: body.dob ? new Date(body.dob).toISOString().split('T')[0] : null,
      status: body.status || null,
      procedure_ordered: body.procedure_ordered === true,
      phone_number: body.phone_number || null,
      calendar_location: body.calendar_location || null,
      insurance_provider: body.insurance_provider || null,
      insurance_id: body.insurance_id || null,
      insurance_plan: body.insurance_plan || null,
      group_number: body.group_number || null,
      address: body.address || null,
      notes: body.notes || null,
      patient_intake_notes: body.patient_intake_notes || null,
      card_image: body.card_image || null,
      knee_pain_duration: body.knee_pain_duration || null,
      knee_osteoarthritis_diagnosis: body.knee_osteoarthritis_diagnosis === true,
      gae_candidate: body.gae_candidate === true,
      trauma_injury_onset: body.trauma_injury_onset === true,
      pain_severity_scale: body.pain_severity_scale ? parseInt(body.pain_severity_scale) : null,
      symptoms_description: body.symptoms_description || null,
      knee_treatments_tried: body.knee_treatments_tried || null,
      fever_chills: body.fever_chills === true,
      knee_imaging: body.knee_imaging === true,
      heel_morning_pain: body.heel_morning_pain === true,
      heel_pain_improves_rest: body.heel_pain_improves_rest === true,
      heel_pain_duration: body.heel_pain_duration || null,
      heel_pain_exercise_frequency: body.heel_pain_exercise_frequency || null,
      plantar_fasciitis_treatments: body.plantar_fasciitis_treatments || null,
      plantar_fasciitis_mobility_impact: body.plantar_fasciitis_mobility_impact === true,
      plantar_fasciitis_imaging: body.plantar_fasciitis_imaging === true,
      email: body.email || null
    }

    // Insert new lead into database
    const { data, error } = await supabase
      .from('new_leads')
      .insert([leadData])
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: error.message }),
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
        message: 'Lead created successfully',
        data: data[0],
        project_created: !existingProject
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
