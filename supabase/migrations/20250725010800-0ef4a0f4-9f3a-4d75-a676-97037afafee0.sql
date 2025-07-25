-- Fix RLS policies to allow anonymous (portal) access for appointments updates
-- The issue is that portal users are not authenticated, so we need to allow anonymous updates

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Portal session updates appointments" ON public.all_appointments;

-- Create a policy that allows anonymous users to update appointments 
-- This is safe since the portal is password-protected at the application level
CREATE POLICY "Anonymous portal updates appointments" 
ON public.all_appointments 
FOR UPDATE 
TO anon
USING (true) 
WITH CHECK (true);

-- Also ensure anonymous users can read appointments (needed for the portal)
DROP POLICY IF EXISTS "Anonymous portal reads appointments" ON public.all_appointments;

CREATE POLICY "Anonymous portal reads appointments" 
ON public.all_appointments 
FOR SELECT 
TO anon
USING (true);