
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

    // Insert new lead into database
    const { data, error } = await supabase
      .from('new_leads')
      .insert([{
        lead_name,
        project_name,
        date: dateObj.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        times_called: parseInt(times_called) || 0
      }])
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
