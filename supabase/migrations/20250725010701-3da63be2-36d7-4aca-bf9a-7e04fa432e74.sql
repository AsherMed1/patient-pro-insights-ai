-- Fix RLS policies for all_appointments table to allow updates in portal sessions
-- First, let's drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Portal session updates appointments" ON public.all_appointments;

-- Create a comprehensive policy that allows updates for portal sessions
CREATE POLICY "Portal session updates appointments" 
ON public.all_appointments 
FOR UPDATE 
USING (true)  
WITH CHECK (true);

-- Also ensure authenticated users can still update (for the main dashboard)
-- This policy should already exist but let's make sure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'all_appointments' 
    AND policyname = 'Authenticated users manage appointments_data'
  ) THEN
    CREATE POLICY "Authenticated users manage appointments_data" 
    ON public.all_appointments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;
END
$$;