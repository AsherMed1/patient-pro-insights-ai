-- CRITICAL FIX: Remove public access to patient records (HIPAA violation)
-- This fixes the exposure of 30,473 patient medical records

-- Drop the insecure public policy that exposes all patient data
DROP POLICY IF EXISTS "Allow viewing leads for operations" ON public.new_leads;

-- Revoke all public and anonymous access to patient records
REVOKE ALL ON public.new_leads FROM anon;
REVOKE ALL ON public.new_leads FROM public;

-- Verify RLS is enabled (should already be, but ensuring)
ALTER TABLE public.new_leads ENABLE ROW LEVEL SECURITY;

-- The existing role-based policies remain in place:
-- - "Admins can manage all leads" (admin role only)
-- - "Agents can manage all leads" (agent role only)
-- - "Project users see assigned project leads" (project_user role with project access only)

-- These policies properly restrict access to authenticated users with appropriate roles