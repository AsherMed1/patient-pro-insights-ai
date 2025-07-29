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

    // Build the query based on identifier type
    let query = supabase.from('new_leads').update({
      ...updateFields,
      updated_at: new Date().toISOString()
    })

    if (id) {
      query = query.eq('id', id)
    } else if (contact_id) {
      query = query.eq('contact_id', contact_id)
    } else {
      query = query.eq('lead_name', lead_name).eq('project_name', project_name)
    }

    // Execute the update
    const { data, error } = await query.select().single()

    if (error) {
      console.error('Database error:', error)
      
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ 
            error: 'Lead not found with the provided identifier' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

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