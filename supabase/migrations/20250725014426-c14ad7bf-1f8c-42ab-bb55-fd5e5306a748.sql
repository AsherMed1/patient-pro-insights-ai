-- Create dummy user accounts for testing using a simpler approach
-- Note: These are for development/testing purposes only

-- Check if users already exist and create them if they don't
DO $$
DECLARE
    admin_id uuid;
    agent_id uuid;
    project_user_id uuid;
    first_project_id uuid;
BEGIN
    -- Create admin user if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            confirmation_token,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            'admin@example.com',
            crypt('admin123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"full_name": "Admin User"}'::jsonb,
            '',
            '',
            ''
        );
    END IF;
    
    -- Create agent user if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'agent@example.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            confirmation_token,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            'agent@example.com',
            crypt('agent123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"full_name": "Agent User"}'::jsonb,
            '',
            '',
            ''
        );
    END IF;
    
    -- Create project user if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'projectuser@example.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data,
            confirmation_token,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            'projectuser@example.com',
            crypt('project123', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"full_name": "Project User"}'::jsonb,
            '',
            '',
            ''
        );
    END IF;
    
    -- Get user IDs
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@example.com';
    SELECT id INTO agent_id FROM auth.users WHERE email = 'agent@example.com';
    SELECT id INTO project_user_id FROM auth.users WHERE email = 'projectuser@example.com';
    
    -- Create profiles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id) THEN
        INSERT INTO public.profiles (id, email, full_name) VALUES (admin_id, 'admin@example.com', 'Admin User');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = agent_id) THEN
        INSERT INTO public.profiles (id, email, full_name) VALUES (agent_id, 'agent@example.com', 'Agent User');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = project_user_id) THEN
        INSERT INTO public.profiles (id, email, full_name) VALUES (project_user_id, 'projectuser@example.com', 'Project User');
    END IF;
    
    -- Assign roles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = agent_id) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (agent_id, 'agent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = project_user_id) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (project_user_id, 'project_user');
    END IF;
    
    -- Assign project access to project user if a project exists
    SELECT id INTO first_project_id FROM public.projects WHERE active = true LIMIT 1;
    
    IF first_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.project_user_access WHERE user_id = project_user_id AND project_id = first_project_id) THEN
        INSERT INTO public.project_user_access (user_id, project_id) VALUES (project_user_id, first_project_id);
    END IF;
    
END $$;