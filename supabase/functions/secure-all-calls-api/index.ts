
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Enhanced security configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security validation functions
function validateInput(data: any): { isValid: boolean; error?: string } {
  const requiredFields = ['project_name', 'lead_name', 'lead_phone_number', 'direction', 'status'];
  
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string') {
      return { isValid: false, error: `Missing or invalid ${field}` };
    }
    
    if (data[field].length > 255) {
      return { isValid: false, error: `${field} exceeds maximum length` };
    }
  }

  // Validate phone number format
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
  if (!phoneRegex.test(data.lead_phone_number.replace(/[\s\-\(\)]/g, ''))) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  // Validate project name format
  const projectRegex = /^[a-zA-Z0-9\-_\s]{1,100}$/;
  if (!projectRegex.test(data.project_name)) {
    return { isValid: false, error: 'Invalid project name format' };
  }

  return { isValid: true };
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(clientId);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 10) { // Max 10 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

async function logSecurityEvent(eventType: string, details: any, clientIp?: string) {
  try {
    await supabase.rpc('log_security_event', {
      event_type_param: eventType,
      ip_address_param: clientIp,
      details_param: details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
      await logSecurityEvent('rate_limit_exceeded', {
        endpoint: 'secure-all-calls-api',
        ip: clientIp,
        userAgent
      }, clientIp);

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate content length
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) { // 10KB limit
      await logSecurityEvent('oversized_request', {
        endpoint: 'secure-all-calls-api',
        contentLength,
        ip: clientIp
      }, clientIp);

      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.text();
    let data;

    try {
      data = JSON.parse(body);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced input validation
    const validation = validateInput(data);
    if (!validation.isValid) {
      await logSecurityEvent('invalid_input', {
        endpoint: 'secure-all-calls-api',
        error: validation.error,
        ip: clientIp
      }, clientIp);

      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize string inputs
    const sanitizedData = {
      ...data,
      project_name: data.project_name.trim(),
      lead_name: data.lead_name.trim(),
      lead_phone_number: data.lead_phone_number.trim(),
      direction: data.direction.trim(),
      status: data.status.trim(),
      agent: data.agent?.trim() || null,
      call_summary: data.call_summary?.trim() || null
    };

    // Enhanced datetime processing with timezone handling
    let processedDateTime;
    if (sanitizedData.call_datetime) {
      try {
        const inputDate = new Date(sanitizedData.call_datetime);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Invalid date format');
        }
        
        // Convert to UTC if not already
        processedDateTime = inputDate.toISOString();
        console.log(`Processed datetime: ${processedDateTime}`);
      } catch (error) {
        console.error('Date processing error:', error);
        processedDateTime = new Date().toISOString();
      }
    } else {
      processedDateTime = new Date().toISOString();
    }

    // Insert call record with enhanced error handling
    const { data: insertResult, error } = await supabase
      .from('all_calls')
      .insert({
        project_name: sanitizedData.project_name,
        lead_name: sanitizedData.lead_name,
        lead_phone_number: sanitizedData.lead_phone_number,
        direction: sanitizedData.direction,
        status: sanitizedData.status,
        agent: sanitizedData.agent,
        call_datetime: processedDateTime,
        date: processedDateTime.split('T')[0],
        duration_seconds: sanitizedData.duration_seconds || 0,
        recording_url: sanitizedData.recording_url || null,
        call_summary: sanitizedData.call_summary
      })
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      
      await logSecurityEvent('database_error', {
        endpoint: 'secure-all-calls-api',
        error: error.message,
        project: sanitizedData.project_name
      }, clientIp);

      return new Response(
        JSON.stringify({ error: 'Failed to save call record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log successful operation
    await logSecurityEvent('call_record_created', {
      endpoint: 'secure-all-calls-api',
      project: sanitizedData.project_name,
      recordId: insertResult?.[0]?.id
    }, clientIp);

    console.log(`Successfully saved call record: ${JSON.stringify(insertResult)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call record saved successfully',
        id: insertResult?.[0]?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    
    await logSecurityEvent('unexpected_error', {
      endpoint: 'secure-all-calls-api',
      error: error.message
    }, clientIp);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
