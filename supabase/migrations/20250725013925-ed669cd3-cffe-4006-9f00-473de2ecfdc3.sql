-- Create dummy user accounts for testing
-- Note: These are for development/testing purposes only

-- Insert dummy users into auth.users (using service role privileges)
-- Admin user
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
  'admin-user-id-12345678-1234-1234-1234-123456789abc'::uuid,
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
) ON CONFLICT (email) DO NOTHING;

-- Agent user
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
  'agent-user-id-12345678-1234-1234-1234-123456789abc'::uuid,
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
) ON CONFLICT (email) DO NOTHING;

-- Project user
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
  'project-user-id-12345678-1234-1234-1234-123456789abc'::uuid,
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
) ON CONFLICT (email) DO NOTHING;

-- Create profiles for the dummy users
INSERT INTO public.profiles (id, email, full_name) VALUES 
  ('admin-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'admin@example.com', 'Admin User'),
  ('agent-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'agent@example.com', 'Agent User'),
  ('project-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'projectuser@example.com', 'Project User')
ON CONFLICT (id) DO NOTHING;

-- Assign roles to the dummy users
INSERT INTO public.user_roles (user_id, role) VALUES 
  ('admin-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'admin'),
  ('agent-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'agent'),
  ('project-user-id-12345678-1234-1234-1234-123456789abc'::uuid, 'project_user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign project access to the project user (first project if any exist)
INSERT INTO public.project_user_access (user_id, project_id)
SELECT 
  'project-user-id-12345678-1234-1234-1234-123456789abc'::uuid,
  p.id
FROM public.projects p 
WHERE p.active = true 
LIMIT 1
ON CONFLICT (user_id, project_id) DO NOTHING;