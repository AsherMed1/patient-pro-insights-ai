
-- Create the app_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'viewer', 'editor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
