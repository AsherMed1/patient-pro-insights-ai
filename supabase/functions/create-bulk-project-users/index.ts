import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // For audit logging, try to get user from auth header if present
    let adminUser = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
      adminUser = user;
    }

    // Parse request body
    const { emails, password } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: 'emails array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!password) {
      return new Response(JSON.stringify({ error: 'password is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Creating ${emails.length} project users with access to all projects`);

    // Fetch all active projects
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, project_name')
      .eq('active', true);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${projects.length} active projects`);

    const results = [];
    const errors = [];

    // Create each user
    for (const email of emails) {
      try {
        console.log(`Creating user: ${email}`);

        // Extract name from email (everything before @)
        const fullName = email.split('@')[0].replace(/\./g, ' ').split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Try to create user in Supabase Auth
        let createResult = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        });

        let userId;
        let isExistingUser = false;

        if (createResult.error) {
          // If user exists, try to find and update them
          if (createResult.error.code === 'email_exists' || createResult.error.status === 422) {
            console.log(`User ${email} already exists, attempting to update password and access...`);
            
            // First check profiles table
            const { data: profileData } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', email)
              .single();
            
            if (profileData) {
              userId = profileData.id;
              console.log(`Found user ID from profiles: ${userId}`);
              
              // Update password for existing user
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { password }
              );
              
              if (updateError) {
                console.error(`Error updating password for ${email}:`, updateError);
                // Continue anyway - we can still update role and access
              } else {
                console.log(`Password updated for ${email}`);
              }
              
              isExistingUser = true;
            } else {
              console.error(`User ${email} exists in auth but not in profiles - skipping`);
              errors.push({ email, error: 'User exists in auth but not in profiles database' });
              continue;
            }
          } else {
            console.error(`Error creating user ${email}:`, createResult.error);
            errors.push({ email, error: createResult.error.message });
            continue;
          }
        } else {
          userId = createResult.data.user.id;
          console.log(`User created: ${email} (${userId})`);
        }

        // Create or update profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            email,
            full_name: fullName,
            welcome_email_sent: false,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error(`Error upserting profile for ${email}:`, profileError);
          errors.push({ email, error: `Profile upsert failed: ${profileError.message}` });
          continue;
        }

        // Assign or update project_user role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'project_user',
          }, { onConflict: 'user_id,role' });

        if (roleError) {
          console.error(`Error assigning role to ${email}:`, roleError);
          errors.push({ email, error: `Role assignment failed: ${roleError.message}` });
          continue;
        }

        // Delete existing project access
        await supabaseAdmin
          .from('project_user_access')
          .delete()
          .eq('user_id', userId);

        // Grant access to all active projects
        const projectAccessRecords = projects.map(project => ({
          user_id: userId,
          project_id: project.id,
        }));

        const { error: accessError } = await supabaseAdmin
          .from('project_user_access')
          .insert(projectAccessRecords);

        if (accessError) {
          console.error(`Error granting project access to ${email}:`, accessError);
          errors.push({ email, error: `Project access failed: ${accessError.message}` });
          continue;
        }

        // Log security audit event (non-critical)
        try {
          await supabaseAdmin.from('security_audit_log').insert({
            event_type: isExistingUser ? 'user_updated' : 'user_created',
            user_id: adminUser?.id || null,
            details: {
              created_user_id: userId,
              created_user_email: email,
              role: 'project_user',
              projects_granted: projects.length,
              created_by: adminUser?.email || 'system',
              was_existing_user: isExistingUser,
            },
          });
        } catch (auditError) {
          console.error('Failed to log audit event (non-critical):', auditError);
        }

        console.log(`✓ User ${email} ${isExistingUser ? 'updated' : 'created'} with access to ${projects.length} projects`);

        results.push({
          email,
          userId,
          fullName,
          role: 'project_user',
          projectsGranted: projects.length,
          success: true,
          wasExistingUser: isExistingUser,
        });

      } catch (error) {
        console.error(`Unexpected error creating user ${email}:`, error);
        errors.push({ email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Created ${results.length} users successfully`,
        results,
        errors: errors.length > 0 ? errors : undefined,
        totalProjects: projects.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
