-- Allow project users to update appointments for their assigned projects
-- This fixes the issue where project_user roles couldn't save status/procedure changes
-- on all_appointments due to RLS blocking UPDATE operations.

-- Create UPDATE policy for project users with access to the appointment's project
CREATE POLICY "Project users can update appointments for assigned projects"
ON public.all_appointments
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1
    FROM public.project_user_access pua
    JOIN public.projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid()
      AND p.project_name = all_appointments.project_name
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1
    FROM public.project_user_access pua
    JOIN public.projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid()
      AND p.project_name = all_appointments.project_name
  )
);
