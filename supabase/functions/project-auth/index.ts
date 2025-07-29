import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, projectName, password, ipAddress, userAgent } = await req.json()

    if (action === 'login') {
      console.log(`Project login attempt for: ${projectName}`)

      // Create session using existing database function
      const { data, error } = await supabaseClient.rpc('create_secure_portal_session', {
        project_name_param: projectName,
        password_param: password,
        ip_address_param: ipAddress,
        user_agent_param: userAgent
      })

      if (error) {
        console.error('Session creation error:', error)
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (!data) {
        console.log('Authentication failed - invalid credentials')
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Session token created successfully
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 8) // 8 hours from now

      console.log('Project login successful')
      return new Response(
        JSON.stringify({ 
          sessionToken: data,
          expiresAt: expiresAt.toISOString(),
          projectName 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'verify') {
      const { sessionToken } = await req.json()
      
      // Verify session using existing database function
      const { data, error } = await supabaseClient.rpc('verify_secure_portal_session', {
        project_name_param: projectName,
        session_token_param: sessionToken,
        ip_address_param: ipAddress
      })

      if (error || !data) {
        return new Response(
          JSON.stringify({ valid: false }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ valid: true }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Project auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})