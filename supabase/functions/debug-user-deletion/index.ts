import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    console.log(`🔍 Checking user: ${userId}`)

    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    console.log(`Auth user exists: ${!!authUser.user}`)
    if (authError) {
      console.log(`Auth error: ${authError.message}`)
    }

    // Check profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    console.log(`Profile exists: ${!!profile}`)
    if (profileError) {
      console.log(`Profile error: ${profileError.message}`)
    }

    // Check user_roles table
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)

    console.log(`Roles exist: ${roles?.length || 0}`)
    if (rolesError) {
      console.log(`Roles error: ${rolesError.message}`)
    }

    // Check project_user_access table
    const { data: access, error: accessError } = await supabaseAdmin
      .from('project_user_access')
      .select('*')
      .eq('user_id', userId)

    console.log(`Project access exist: ${access?.length || 0}`)
    if (accessError) {
      console.log(`Access error: ${accessError.message}`)
    }

    // If user still exists in auth, try to delete them
    if (authUser.user) {
      console.log(`🗑️ Attempting to delete auth user...`)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.log(`Delete error: ${deleteError.message}`)
        return new Response(JSON.stringify({ 
          error: deleteError.message,
          status: 'auth_user_exists_but_delete_failed'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        console.log(`✅ Auth user deleted successfully`)
        return new Response(JSON.stringify({ 
          success: true,
          status: 'auth_user_deleted'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: 'user_already_deleted',
      authUser: !!authUser.user,
      profile: !!profile,
      roles: roles?.length || 0,
      access: access?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})