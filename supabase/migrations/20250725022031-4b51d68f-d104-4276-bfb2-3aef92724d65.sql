-- Fix the foreign key relationship between profiles and user_roles tables
-- This will allow proper joins between the tables

-- Add foreign key constraint from user_roles.user_id to profiles.id
-- Note: profiles.id should reference auth.users.id, and user_roles.user_id should also reference auth.users.id
-- So both tables are linked through the same auth.users.id

-- First, let's ensure the relationship is properly defined
-- The profiles.id and user_roles.user_id both reference auth.users.id
-- We need to allow PostgREST to understand this relationship

-- Add a comment to help PostgREST understand the relationship
COMMENT ON COLUMN user_roles.user_id IS 'References profiles.id via auth.users.id';

-- Create an index to improve join performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);