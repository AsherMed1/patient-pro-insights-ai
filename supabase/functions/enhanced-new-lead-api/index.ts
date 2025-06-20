
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
  return input.replace(/[<>'"&]/g, '').trim().substring(0, 500)
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

const validateInput = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!data.project_name || typeof data.project_name !== 'string') {
    errors.push('Project name is required and must be a string')
  }
  
  if (!data.lead_name || typeof data.lead_name !== 'string') {
    errors.push('Lead name is required and must be a string')
  }
  
  if (!data.date) {
    errors.push('Date is required')
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format')
  }
  
  if (data.phone_number && !validatePhone(data.phone_number)) {
    errors.push('Invalid phone number format')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

const checkRateLimit = (clientIP: string, maxRequests = 15, windowMs = 60000): boolean => {
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
      details_param: { endpoint: 'new-lead-api', method: req.method }
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
        date: body.date,
        first_name: body.first_name ? sanitizeInput(body.first_name) : null,
        last_name: body.last_name ? sanitizeInput(body.last_name) : null,
        email: body.email ? sanitizeInput(body.email.toLowerCase()) : null,
        phone_number: body.phone_number ? sanitizeInput(body.phone_number) : null,
        status: body.status ? sanitizeInput(body.status) : null,
        calendar_location: body.calendar_location ? sanitizeInput(body.calendar_location) : null,
        insurance_provider: body.insurance_provider ? sanitizeInput(body.insurance_provider) : null,
        insurance_id: body.insurance_id ? sanitizeInput(body.insurance_id) : null,
        insurance_plan: body.insurance_plan ? sanitizeInput(body.insurance_plan) : null,
        group_number: body.group_number ? sanitizeInput(body.group_number) : null,
        address: body.address ? sanitizeInput(body.address) : null,
        notes: body.notes ? sanitizeInput(body.notes) : null,
        times_called: body.times_called || 0,
        appt_date: body.appt_date || null,
        dob: body.dob || null,
        procedure_ordered: body.procedure_ordered || false,
        // Medical fields with validation
        knee_osteoarthritis_diagnosis: typeof body.knee_osteoarthritis_diagnosis === 'boolean' ? body.knee_osteoarthritis_diagnosis : null,
        gae_candidate: typeof body.gae_candidate === 'boolean' ? body.gae_candidate : null,
        trauma_injury_onset: typeof body.trauma_injury_onset === 'boolean' ? body.trauma_injury_onset : null,
        pain_severity_scale: (typeof body.pain_severity_scale === 'number' && body.pain_severity_scale >= 1 && body.pain_severity_scale <= 10) ? body.pain_severity_scale : null,
        fever_chills: typeof body.fever_chills === 'boolean' ? body.fever_chills : null,
        knee_imaging: typeof body.knee_imaging === 'boolean' ? body.knee_imaging : null,
        heel_morning_pain: typeof body.heel_morning_pain === 'boolean' ? body.heel_morning_pain : null,
        heel_pain_improves_rest: typeof body.heel_pain_improves_rest === 'boolean' ? body.heel_pain_improves_rest : null,
        plantar_fasciitis_mobility_impact: typeof body.plantar_fasciitis_mobility_impact === 'boolean' ? body.plantar_fasciitis_mobility_impact : null,
        plantar_fasciitis_imaging: typeof body.plantar_fasciitis_imaging === 'boolean' ? body.plantar_fasciitis_imaging : null
      }

      // Insert lead
      const { data, error } = await supabase
        .from('new_leads')
        .insert([sanitizedData])
        .select()

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create lead' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Lead created successfully:', data[0].id)
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
        .from('new_leads')
        .select('*')
        .eq('project_name', sanitizeInput(projectName))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch leads' }),
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
