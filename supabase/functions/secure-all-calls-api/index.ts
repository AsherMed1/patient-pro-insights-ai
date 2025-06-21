
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

interface CallData {
  project_name: string
  lead_name: string
  lead_phone_number: string
  date: string
  call_datetime: string
  duration_seconds: number
  direction: string
  status: string
  agent?: string
  recording_url?: string
  call_summary?: string
}

function validateCallData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.project_name || typeof data.project_name !== 'string' || data.project_name.length > 100) {
    errors.push('Invalid project_name')
  }
  
  if (!data.lead_name || typeof data.lead_name !== 'string' || data.lead_name.length > 100) {
    errors.push('Invalid lead_name')
  }
  
  if (!data.lead_phone_number || typeof data.lead_phone_number !== 'string' || data.lead_phone_number.length > 20) {
    errors.push('Invalid lead_phone_number')
  }
  
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Invalid date format (YYYY-MM-DD required)')
  }
  
  if (!data.call_datetime || typeof data.call_datetime !== 'string') {
    errors.push('Invalid call_datetime')
  }
  
  if (typeof data.duration_seconds !== 'number' || data.duration_seconds < 0) {
    errors.push('Invalid duration_seconds')
  }
  
  if (!data.direction || !['inbound', 'outbound'].includes(data.direction)) {
    errors.push('Invalid direction (must be inbound or outbound)')
  }
  
  if (!data.status || typeof data.status !== 'string' || data.status.length > 50) {
    errors.push('Invalid status')
  }
  
  return { isValid: errors.length === 0, errors }
}

function checkRateLimit(clientId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `${clientId}_${windowStart}`
  
  const existing = rateLimitStore.get(key)
  if (existing) {
    if (existing.count >= maxRequests) {
      return false // Rate limited
    }
    existing.count++
  } else {
    rateLimitStore.set(key, { count: 1, windowStart })
    
    // Cleanup old entries
    if (rateLimitStore.size > 1000) {
      const cutoff = now - (24 * 60 * 60 * 1000) // 24 hours
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.windowStart < cutoff) {
          rateLimitStore.delete(k)
        }
      }
    }
  }
  
  return true // Not rate limited
}

function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, maxLength)
}

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const clientIP = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
    
    // Enhanced rate limiting
    if (!checkRateLimit(clientIP, 10, 60000)) {
      console.error(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return new Response(
        JSON.stringify({ error: 'Request body too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { isValid, errors } = validateCallData(body)
    
    if (!isValid) {
      console.error('Validation errors:', errors)
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize inputs
    const sanitizedData: CallData = {
      project_name: sanitizeInput(body.project_name, 100),
      lead_name: sanitizeInput(body.lead_name, 100),
      lead_phone_number: sanitizeInput(body.lead_phone_number, 20),
      date: body.date,
      call_datetime: body.call_datetime,
      duration_seconds: Math.max(0, Math.min(body.duration_seconds, 86400)), // Max 24 hours
      direction: body.direction,
      status: sanitizeInput(body.status, 50),
      agent: body.agent ? sanitizeInput(body.agent, 100) : undefined,
      recording_url: body.recording_url ? sanitizeInput(body.recording_url, 500) : undefined,
      call_summary: body.call_summary ? sanitizeInput(body.call_summary, 2000) : undefined
    }

    // Convert datetime to proper format with timezone handling
    let finalDateTime: string
    try {
    // Check if timezone info is present
    if (sanitizedData.call_datetime.includes('+') || sanitizedData.call_datetime.includes('Z')) {
      // Has timezone info, use as-is
      finalDateTime = new Date(sanitizedData.call_datetime).toISOString()
    } else {
      // No timezone info, treat as Central Time
      console.log(`No timezone info detected, treating as Central Time`)
      
      const dateTime = new Date(sanitizedData.call_datetime)
      const now = new Date()
      
      // Check if we're in DST (rough approximation)
      const isDST = now.getTimezoneOffset() < 360 // Less than 6 hours from UTC
      const offsetHours = isDST ? 5 : 6 // CDT is UTC-5, CST is UTC-6
      
      console.log(`Is DST: ${isDST} Offset hours: ${offsetHours}`)
      
      // Add the offset to convert to UTC
      const utcDateTime = new Date(dateTime.getTime() + (offsetHours * 60 * 60 * 1000))
      finalDateTime = utcDateTime.toISOString()
      
      console.log(`Converted Central to UTC: ${finalDateTime}`)
    }
    
    console.log(`Final UTC datetime to save: ${finalDateTime}`)
    } catch (error) {
      console.error('DateTime conversion error:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid datetime format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert call record
    const { data, error } = await supabase
      .from('all_calls')
      .insert({
        ...sanitizedData,
        call_datetime: finalDateTime
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save call record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log security event
    const { error: logError } = await supabase.rpc('log_security_event_enhanced', {
      event_type_param: 'api_call',
      ip_address_param: clientIP,
      user_agent_param: userAgent,
      details_param: {
        endpoint: 'secure-all-calls-api',
        user_id: user.id,
        request_id: requestId,
        success: true
      },
      severity_param: 'LOW'
    })

    if (logError) {
      console.error('Failed to log security event:', logError)
    }

    console.log(`Successfully saved call record with UTC datetime: ${finalDateTime}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data[0],
        request_id: requestId
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
        request_id: req.headers.get('x-request-id') || crypto.randomUUID()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
