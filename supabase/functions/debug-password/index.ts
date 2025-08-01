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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { project_name, test_password } = await req.json()

    console.log('Debug password test for:', project_name)
    console.log('Test password provided:', test_password ? '[REDACTED]' : 'NONE')

    // Get the stored password hash
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('portal_password')
      .eq('project_name', project_name)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Stored hash exists:', !!project.portal_password)
    console.log('Hash length:', project.portal_password?.length)
    console.log('Hash prefix:', project.portal_password?.substring(0, 10))

    // Test password verification using the database function
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_password', {
        password: test_password,
        hash: project.portal_password
      })

    console.log('Verify result:', verifyResult)
    console.log('Verify error:', verifyError)

    return new Response(
      JSON.stringify({ 
        success: true,
        has_stored_password: !!project.portal_password,
        hash_length: project.portal_password?.length,
        hash_prefix: project.portal_password?.substring(0, 10),
        verification_result: verifyResult,
        verification_error: verifyError
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Debug password error:', error)
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