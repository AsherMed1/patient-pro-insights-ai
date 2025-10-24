-- Remove the insecure public access policy
DROP POLICY IF EXISTS "Allow viewing appointments for operations" ON public.all_appointments;

-- Ensure all public/anon access is revoked
REVOKE ALL ON public.all_appointments FROM anon;
REVOKE ALL ON public.all_appointments FROM public;