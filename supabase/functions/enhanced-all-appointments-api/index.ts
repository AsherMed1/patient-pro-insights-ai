
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Security utilities
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[<>'"&]/g, '').trim().substring(0, 1000)
}

const validateInput = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!data.project_name || typeof data.project_name !== 'string') {
    errors.push('Project name is required and must be a string')
  }
  
  if (!data.lead_name || typeof data.lead_name !== 'string') {
    errors.push('Lead name is required and must be a string')
  }
  
  if (!data.date_appointment_created) {
    errors.push('Appointment creation date is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

const checkRateLimit = (clientIP: string, maxRequests = 10, windowMs = 60000): boolean => {
  const now = Date.now()
  const record = rateLimitMap.get(clientIP)
  
  if (!record || now - record.resetTime > windowMs) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    
    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Too many requests.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log security event
    await supabase.rpc('log_security_event', {
      event_type_param: 'api_request',
      ip_address_param: clientIP,
      user_agent_param: req.headers.get('user-agent'),
      details_param: { endpoint: 'all-appointments-api', method: req.method }
    })

    if (req.method === 'POST') {
      const body = await req.json()
      
      // Validate input
      const validation = validateInput(body)
      if (!validation.isValid) {
        console.log('Validation failed:', validation.errors)
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validation.errors }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Sanitize inputs
      const sanitizedData = {
        project_name: sanitizeInput(body.project_name),
        lead_name: sanitizeInput(body.lead_name),
        lead_email: body.lead_email ? sanitizeInput(body.lead_email) : null,
        lead_phone_number: body.lead_phone_number ? sanitizeInput(body.lead_phone_number) : null,
        date_appointment_created: body.date_appointment_created,
        date_of_appointment: body.date_of_appointment || null,
        requested_time: body.requested_time || null,
        calendar_name: body.calendar_name ? sanitizeInput(body.calendar_name) : null,
        agent: body.agent ? sanitizeInput(body.agent) : null,
        agent_number: body.agent_number ? sanitizeInput(body.agent_number) : null,
        stage_booked: body.stage_booked ? sanitizeInput(body.stage_booked) : null,
        ghl_id: body.ghl_id ? sanitizeInput(body.ghl_id) : null,
        confirmed_number: body.confirmed_number ? sanitizeInput(body.confirmed_number) : null,
        status: body.status ? sanitizeInput(body.status) : null,
        color_indicator: body.color_indicator ? sanitizeInput(body.color_indicator) : null,
        appointment_id: body.appointment_id ? sanitizeInput(body.appointment_id) : null,
        showed: body.showed || false,
        confirmed: body.confirmed || false,
        procedure_ordered: body.procedure_ordered || false
      }

      // Insert appointment
      const { data, error } = await supabase
        .from('all_appointments')
        .insert([sanitizedData])
        .select()

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create appointment' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Appointment created successfully:', data[0].id)
      return new Response(
        JSON.stringify({ success: true, data: data[0] }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const projectName = url.searchParams.get('project_name')
      
      if (!projectName) {
        return new Response(
          JSON.stringify({ error: 'Project name is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data, error } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('project_name', sanitizeInput(projectName))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch appointments' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
