import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing environment variables');
    }

    // Verify the caller is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Snapshot the departed user's identity into HIPAA audit metadata before the FK link is cleared
    try {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle();

      const { data: auditRows } = await supabaseAdmin
        .from('hipaa_audit_log')
        .select('id, metadata')
        .eq('user_id', userId);

      if (auditRows?.length) {
        for (const row of auditRows) {
          const merged = {
            ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
            deleted_user_id: userId,
            deleted_user_email: targetProfile?.email ?? null,
            deleted_user_name: targetProfile?.full_name ?? null,
          };
          await supabaseAdmin.from('hipaa_audit_log').update({ metadata: merged }).eq('id', row.id);
        }
      }
    } catch (stampError) {
      console.error('Failed to stamp HIPAA audit metadata:', stampError);
    }

    // Delete from project_user_access first (foreign key constraints)
    await supabaseAdmin
      .from('project_user_access')
      .delete()
      .eq('user_id', userId);

    // Delete from user_roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Delete from profiles
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // Delete from auth.users using admin client
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(JSON.stringify({ error: `Failed to delete user from auth: ${authError.message}`, details: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Log audit event
    try {
      await supabaseAdmin.rpc('log_audit_event', {
        p_entity: 'user',
        p_action: 'deleted',
        p_description: `User ${userId} deleted by admin ${user.id}`,
        p_source: 'manual',
        p_metadata: { deleted_user_id: userId, deleted_by: user.id }
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
