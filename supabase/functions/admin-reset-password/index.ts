import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the caller is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 [admin-reset-password] Request from user:', user.email);

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('❌ [admin-reset-password] Not an admin:', user.email, roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [admin-reset-password] Admin verified:', user.email);

    // Parse request body
    const { userId, newPassword } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from resetting their own password via this tool
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot reset your own password via admin tool. Use the regular password change form.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a secure password if none provided
    let passwordToSet = newPassword;
    let isGenerated = false;

    if (!passwordToSet) {
      // Generate a secure random password (16 chars, mixed case, numbers, symbols)
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      passwordToSet = Array.from(array, byte => charset[byte % charset.length]).join('');
      isGenerated = true;
      console.log('🔐 [admin-reset-password] Generated secure password');
    }

    // Get target user info for audit log
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: passwordToSet }
    );

    if (updateError) {
      console.error('❌ [admin-reset-password] Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset password: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [admin-reset-password] Password reset successful for user:', userId);

    // Log audit event
    try {
      await supabaseAdmin.rpc('log_audit_event', {
        p_entity: 'user_password',
        p_action: 'admin_reset',
        p_description: `Admin ${user.email} reset password for user ${targetProfile?.email || userId}`,
        p_source: 'manual',
        p_metadata: {
          admin_user_id: user.id,
          admin_email: user.email,
          target_user_id: userId,
          target_email: targetProfile?.email,
          password_generated: isGenerated
        }
      });
    } catch (auditError) {
      console.error('⚠️ [admin-reset-password] Failed to log audit event:', auditError);
    }

    // Return success with generated password if applicable
    return new Response(
      JSON.stringify({
        success: true,
        generatedPassword: isGenerated ? passwordToSet : undefined,
        message: `Password reset successful for ${targetProfile?.email || 'user'}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 [admin-reset-password] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
