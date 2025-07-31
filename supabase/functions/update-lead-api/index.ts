import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Only allow PUT and PATCH methods
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use PUT or PATCH.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body based on content type
    let body
    const contentType = req.headers.get('content-type') || ''
    
    try {
      if (contentType.includes('application/json')) {
        body = await req.json()
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData()
        body = Object.fromEntries(formData.entries())
      } else if (contentType.includes('text/plain')) {
        const text = await req.text()
        // For plain text, assume it's patient_intake_notes and require other params as query params
        const url = new URL(req.url)
        body = {
          patient_intake_notes: text,
          id: url.searchParams.get('id'),
          lead_name: url.searchParams.get('lead_name'),
          project_name: url.searchParams.get('project_name'),
          contact_id: url.searchParams.get('contact_id')
        }
      } else {
        // Default to JSON parsing
        body = await req.json()
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body format. Supports JSON, form data, or plain text.',
          details: error.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate identifier - must have either id OR (lead_name + project_name) OR contact_id
    const { id, lead_name, project_name, contact_id, ...updateFields } = body

    if (!id && !(lead_name && project_name) && !contact_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Must provide either "id" OR both "lead_name" and "project_name" OR "contact_id" to identify the lead' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate pain_severity_scale if provided
    if (updateFields.pain_severity_scale !== undefined) {
      const painScale = updateFields.pain_severity_scale
      if (painScale !== null && (typeof painScale !== 'number' || painScale < 1 || painScale > 10)) {
        return new Response(
          JSON.stringify({ 
            error: 'pain_severity_scale must be a number between 1 and 10 or null' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Helper function to format webhook payload as patient intake notes (same as new-lead-api)
    const formatWebhookPayload = (body) => {
      // If the body contains a pre-formatted intake note, use it
      if (body.patient_intake_notes) {
        return body.patient_intake_notes;
      }
      
      // If the body contains detailed structured data, format it
      let formattedNotes = '';
      
      // Contact Information
      if (body.lead_name || body.phone_number || body.email || body.contact_id) {
        formattedNotes += 'Contact: ';
        if (body.lead_name) formattedNotes += `Name: ${body.lead_name}`;
        if (body.phone_number) formattedNotes += `, Phone: ${body.phone_number}`;
        if (body.email) formattedNotes += `, Email: ${body.email}`;
        if (body.contact_id) formattedNotes += `, Patient ID: ${body.contact_id}`;
        if (body.dob) formattedNotes += `, DOB: ${body.dob}`;
        if (body.address) formattedNotes += `, Address: ${body.address}`;
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
      const hasPathology = body.pain_severity_scale || body.symptoms_description || body.knee_treatments_tried || 
                          body.knee_pain_duration || body.heel_pain_duration || body.knee_osteoarthritis_diagnosis ||
                          body.gae_candidate || body.trauma_injury_onset || body.knee_imaging || body.plantar_fasciitis_treatments;
                          
      if (hasPathology) {
        formattedNotes += 'Pathology: ';
        if (body.knee_pain_duration) formattedNotes += `Duration: ${body.knee_pain_duration}`;
        if (body.heel_pain_duration) formattedNotes += `Duration: ${body.heel_pain_duration}`;
        if (body.knee_osteoarthritis_diagnosis !== undefined) formattedNotes += `, OA or TKR Diagnosed: ${body.knee_osteoarthritis_diagnosis ? 'YES' : 'NO'}`;
        if (body.trauma_injury_onset !== undefined) formattedNotes += `, Trauma-related Onset: ${body.trauma_injury_onset ? 'YES' : 'NO'}`;
        if (body.pain_severity_scale) formattedNotes += `, Pain Level: ${body.pain_severity_scale}`;
        if (body.symptoms_description) formattedNotes += `, Symptoms: ${body.symptoms_description}`;
        if (body.knee_treatments_tried) formattedNotes += `, Treatments Tried: ${body.knee_treatments_tried}`;
        if (body.plantar_fasciitis_treatments) formattedNotes += `, Treatments: ${body.plantar_fasciitis_treatments}`;
        if (body.knee_imaging !== undefined) formattedNotes += `, Imaging Done: ${body.knee_imaging ? 'YES' : 'NO'}`;
        formattedNotes += ' /n ';
      }
      
      // Additional Notes
      if (body.notes) {
        formattedNotes += `Notes: ${body.notes}`;
      }
      
      return formattedNotes || null;
    };

    // If the update contains structured data that should be formatted as notes, format it
    if (!updateFields.patient_intake_notes && Object.keys(body).some(key => 
        ['insurance_provider', 'pain_severity_scale', 'symptoms_description', 'knee_treatments_tried'].includes(key)
    )) {
      const formattedNotes = formatWebhookPayload(body);
      if (formattedNotes) {
        updateFields.patient_intake_notes = formattedNotes;
      }
    }

    // Remove any fields that shouldn't be updated directly
    delete updateFields.id
    delete updateFields.contact_id
    delete updateFields.created_at
    delete updateFields.updated_at

    // If no update fields provided, return error
    if (Object.keys(updateFields).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields provided for update' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build the query based on identifier type with fallback strategy
    let data = null;
    let error = null;
    let identificationMethod = '';

    // Strategy 1: Try by ID first (highest priority)
    if (id) {
      console.log('Attempting to find lead by ID:', id);
      const result = await supabase.from('new_leads').update({
        ...updateFields,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().maybeSingle();
      
      data = result.data;
      error = result.error;
      identificationMethod = 'id';
    }
    
    // Strategy 2: Try by contact_id if ID didn't work
    if (!data && !error && contact_id) {
      console.log('Attempting to find lead by contact_id:', contact_id);
      const result = await supabase.from('new_leads').update({
        ...updateFields,
        updated_at: new Date().toISOString()
      }).eq('contact_id', contact_id).select().maybeSingle();
      
      data = result.data;
      error = result.error;
      identificationMethod = 'contact_id';
      
      // Strategy 3: If contact_id fails and we have phone_number, try phone fallback
      if (!data && !error && updateFields.phone_number) {
        console.log('Contact ID not found, attempting fallback by phone number:', updateFields.phone_number);
        const phoneResult = await supabase.from('new_leads').update({
          ...updateFields,
          contact_id: contact_id, // Set the contact_id while we're at it
          updated_at: new Date().toISOString()
        }).eq('phone_number', updateFields.phone_number).select().maybeSingle();
        
        data = phoneResult.data;
        error = phoneResult.error;
        identificationMethod = 'phone_number_fallback';
      }
    }
    
    // Strategy 4: Try by lead_name + project_name if nothing else worked
    if (!data && !error && lead_name && project_name) {
      console.log('Attempting to find lead by name and project:', lead_name, project_name);
      const result = await supabase.from('new_leads').update({
        ...updateFields,
        updated_at: new Date().toISOString()
      }).eq('lead_name', lead_name).eq('project_name', project_name).select().maybeSingle();
      
      data = result.data;
      error = result.error;
      identificationMethod = 'name_and_project';
    }

    if (error) {
      console.error('Database error:', error)
      
      return new Response(
        JSON.stringify({ 
          error: 'Database error occurred while updating lead',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!data) {
      console.log('Lead not found with any of the provided identifiers');
      return new Response(
        JSON.stringify({ 
          error: 'Lead not found with the provided identifier(s)',
          attempted_methods: {
            id: !!id,
            contact_id: !!contact_id,
            phone_fallback: !!(contact_id && updateFields.phone_number),
            name_and_project: !!(lead_name && project_name)
          }
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Lead updated successfully:', { 
      id: data.id, 
      lead_name: data.lead_name, 
      project_name: data.project_name 
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead updated successfully',
        data: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
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