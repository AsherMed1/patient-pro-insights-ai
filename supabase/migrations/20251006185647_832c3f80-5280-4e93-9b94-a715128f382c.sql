-- Add DELETE policy for project users to delete appointments from assigned projects
CREATE POLICY "Project users can delete appointments for assigned projects"
ON public.all_appointments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'project_user'::app_role) 
  AND EXISTS (
    SELECT 1
    FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() 
    AND p.project_name = all_appointments.project_name
  )
);