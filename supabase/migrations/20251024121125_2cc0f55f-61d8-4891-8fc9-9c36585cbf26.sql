-- Remove the insecure public access policy from all_calls
DROP POLICY IF EXISTS "Allow viewing calls for operations" ON public.all_calls;

-- Ensure RLS is enabled on all_calls
ALTER TABLE public.all_calls ENABLE ROW LEVEL SECURITY;

-- Revoke all public/anon access to call records
REVOKE ALL ON public.all_calls FROM anon;
REVOKE ALL ON public.all_calls FROM public;

-- Add policy for project users to update calls in their assigned projects
CREATE POLICY "Project users can update assigned project calls"
ON public.all_calls
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'project_user'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = all_calls.project_name
  )
)
WITH CHECK (
  has_role(auth.uid(), 'project_user'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = all_calls.project_name
  )
);