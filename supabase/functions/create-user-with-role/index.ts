import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting create-user-with-role function');
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('📊 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey
    });

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('❌ Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is authenticated using the admin client
    console.log('🔍 Verifying user authentication...');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError) {
      console.error('❌ Auth error:', authError);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication',
        details: authError.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user) {
      console.error('❌ No user found');
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user has admin role using admin client to bypass RLS
    console.log('🔍 Checking user role...');
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('❌ Role check error:', roleError);
      return new Response(JSON.stringify({ 
        error: 'Role verification failed',
        details: roleError.message 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('👤 User role:', userRole?.role);

    if (userRole?.role !== 'admin') {
      console.error('❌ User is not admin. Role:', userRole?.role);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Admin access verified');

    console.log('📝 Parsing request body...');
    const { email, password, fullName, role, projectId } = await req.json();
    
    console.log('📋 Request data:', {
      email,
      hasPassword: !!password,
      fullName,
      role,
      projectId
    });

    if (!email || !password || !role) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({ error: 'Email, password, and role are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the user using admin client
    console.log('👤 Creating user with admin client...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName
      },
      email_confirm: true
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      
      // Handle specific error cases
      let errorMessage = 'Failed to create user';
      if (createError.message.includes('already been registered')) {
        errorMessage = `A user with email ${email} already exists in the system. Please use a different email address.`;
      } else if (createError.message.includes('email_exists')) {
        errorMessage = `A user with email ${email} already exists in the system. Please use a different email address.`;
      } else {
        errorMessage = createError.message || 'Failed to create user';
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        code: createError.status === 422 ? 'EMAIL_EXISTS' : 'CREATE_ERROR'
      }), {
        status: createError.status === 422 ? 422 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newUser.user) {
      console.error('❌ No user returned from creation');
      return new Response(JSON.stringify({ error: 'Failed to create user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User created successfully:', newUser.user.id);

    // Create profile
    console.log('📝 Creating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: email,
        full_name: fullName || email
      });

    if (profileError) {
      console.error('⚠️ Error creating profile:', profileError);
      // Don't fail the entire operation for profile errors
    } else {
      console.log('✅ Profile created successfully');
    }

    // Assign role
    console.log('🏷️ Assigning user role...');
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      });

    if (roleAssignError) {
      console.error('❌ Error assigning role:', roleAssignError);
      return new Response(JSON.stringify({ 
        error: 'Failed to assign role',
        details: roleAssignError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Role assigned successfully');

    // If role is project_user and projectId is provided, assign project access
    if (role === 'project_user' && projectId) {
      console.log('🔗 Assigning project access...');
      const { error: projectAccessError } = await supabaseAdmin
        .from('project_user_access')
        .insert({
          user_id: newUser.user.id,
          project_id: projectId,
          granted_by: user.id
        });

      if (projectAccessError) {
        console.error('❌ Error assigning project access:', projectAccessError);
        return new Response(JSON.stringify({ 
          error: 'Failed to assign project access',
          details: projectAccessError.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ Project access assigned successfully');
    }

    // Log security event (optional - don't fail if this fails)
    console.log('📋 Logging security event...');
    try {
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          event_type: 'user_created',
          user_id: user.id,
          details: {
            created_user_id: newUser.user.id,
            created_user_email: email,
            assigned_role: role,
            project_id: projectId
          }
        });
      console.log('✅ Security event logged');
    } catch (auditError) {
      console.warn('⚠️ Failed to log security event:', auditError);
      // Don't fail the entire operation for audit logging errors
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: fullName || email
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-user-with-role function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});