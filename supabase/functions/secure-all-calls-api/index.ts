
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Security configuration
const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_IP: 10,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_PAYLOAD_SIZE: 10 * 1024, // 10KB
  REQUIRED_FIELDS: ['lead_name', 'lead_phone_number', 'project_name', 'date', 'call_datetime', 'direction', 'status'],
};

// Input validation and sanitization
function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 1000);
}

function validateCallData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  for (const field of SECURITY_CONFIG.REQUIRED_FIELDS) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`${field} is required`);
    }
  }
  
  // Validate specific formats
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }
  
  if (data.direction && !['inbound', 'outbound'].includes(data.direction.toLowerCase())) {
    errors.push('Direction must be either "inbound" or "outbound"');
  }
  
  if (data.lead_phone_number && !/^[\+]?[1-9][\d]{0,15}$/.test(data.lead_phone_number.replace(/\s|-|\(|\)/g, ''))) {
    errors.push('Invalid phone number format');
  }
  
  if (data.duration_seconds && (isNaN(Number(data.duration_seconds)) || Number(data.duration_seconds) < 0)) {
    errors.push('Duration must be a positive number');
  }
  
  return { valid: errors.length === 0, errors };
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

async function checkRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const { data: rateLimitData } = await supabase
    .from('rate_limit_log')
    .select('count')
    .eq('identifier', clientIP)
    .eq('action_type', 'call_api_request')
    .gte('window_start', new Date(Date.now() - SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS).toISOString());
  
  const totalRequests = rateLimitData?.reduce((sum: number, record: any) => sum + record.count, 0) || 0;
  
  if (totalRequests >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP) {
    return false;
  }
  
  // Log this request
  await supabase
    .from('rate_limit_log')
    .insert({
      identifier: clientIP,
      action_type: 'call_api_request',
      count: 1
    });
  
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Security checks
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientIP = getClientIP(req);
    
    // Rate limiting
    const rateLimitPassed = await checkRateLimit(supabase, clientIP);
    if (!rateLimitPassed) {
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'rate_limit_exceeded',
          ip_address: clientIP,
          user_agent: req.headers.get('user-agent'),
          details: { endpoint: 'all-calls-api', action: 'POST' }
        });
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payload size check
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate body
    const body = await req.json();
    
    // Input validation
    const validation = validateCallData(body);
    if (!validation.valid) {
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'invalid_input',
          ip_address: clientIP,
          user_agent: req.headers.get('user-agent'),
          details: { endpoint: 'all-calls-api', errors: validation.errors }
        });
      
      return new Response(
        JSON.stringify({ error: 'Invalid input data', details: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      lead_name: sanitizeInput(body.lead_name),
      lead_phone_number: sanitizeInput(body.lead_phone_number),
      project_name: sanitizeInput(body.project_name),
      date: sanitizeInput(body.date),
      call_datetime: sanitizeInput(body.call_datetime),
      direction: sanitizeInput(body.direction.toLowerCase()),
      status: sanitizeInput(body.status),
      duration_seconds: parseInt(body.duration_seconds?.toString() || '0') || 0,
      agent: body.agent ? sanitizeInput(body.agent) : null,
      recording_url: body.recording_url ? sanitizeInput(body.recording_url) : null,
      call_summary: body.call_summary ? sanitizeInput(body.call_summary) : null,
    };

    // Process datetime
    let callDateTime: Date;
    try {
      callDateTime = new Date(sanitizedData.call_datetime);
      if (isNaN(callDateTime.getTime())) {
        throw new Error('Invalid datetime');
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid call_datetime format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert call record
    const { data, error } = await supabase
      .from('all_calls')
      .insert([{
        ...sanitizedData,
        date: new Date(sanitizedData.date).toISOString().split('T')[0],
        call_datetime: callDateTime.toISOString(),
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'database_error',
          ip_address: clientIP,
          user_agent: req.headers.get('user-agent'),
          details: { endpoint: 'all-calls-api', error: error.message }
        });
      
      return new Response(
        JSON.stringify({ error: 'Failed to create call record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful operation
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: 'call_record_created',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent'),
        details: { endpoint: 'all-calls-api', record_id: data[0].id }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call record created successfully',
        data: data[0]
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    const clientIP = getClientIP(req);
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: 'function_error',
        ip_address: clientIP,
        user_agent: req.headers.get('user-agent'),
        details: { endpoint: 'all-calls-api', error: error.message }
      });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
