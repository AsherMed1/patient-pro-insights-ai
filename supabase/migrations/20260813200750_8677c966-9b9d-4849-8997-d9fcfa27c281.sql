ALTER TABLE public.appointment_notes
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'clinic';

ALTER TABLE public.appointment_notes
  DROP CONSTRAINT IF EXISTS appointment_notes_visibility_check;

ALTER TABLE public.appointment_notes
  ADD CONSTRAINT appointment_notes_visibility_check CHECK (visibility IN ('internal','clinic'));

UPDATE public.appointment_notes
SET visibility = 'internal'
WHERE created_by = 'System'
   OR note_text LIKE 'Declined:%'
   OR note_text LIKE 'Review Queue:%'
   OR note_text LIKE 'Status changed from%'
   OR note_text LIKE 'Potential OON insurance reviewed%'
   OR note_text LIKE 'Adopted slot FROM:%';

DROP POLICY IF EXISTS "Secure_project_user_appointment_notes" ON public.appointment_notes;

CREATE POLICY "Secure_project_user_appointment_notes"
ON public.appointment_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'agent'::app_role)
  OR (
    has_role(auth.uid(), 'project_user'::app_role)
    AND visibility = 'clinic'
    AND EXISTS (
      SELECT 1
      FROM all_appointments a
      JOIN project_user_access pua ON EXISTS (
        SELECT 1 FROM projects p
        WHERE p.project_name = a.project_name AND p.id = pua.project_id
      )
      WHERE a.id = appointment_notes.appointment_id
        AND pua.user_id = auth.uid()
    )
  )
);