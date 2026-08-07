ALTER TABLE public.qa_note_mentions
  ADD CONSTRAINT qa_note_mentions_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.all_appointments(id) ON DELETE CASCADE,
  ADD CONSTRAINT qa_note_mentions_appointment_note_id_fkey
    FOREIGN KEY (appointment_note_id) REFERENCES public.appointment_notes(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Case viewers can create mentions" ON public.qa_note_mentions;

CREATE POLICY "Case viewers can create mentions"
ON public.qa_note_mentions
FOR INSERT
TO authenticated
WITH CHECK (
  mentioned_by_user_id = auth.uid()
  AND (
    (case_id IS NOT NULL AND has_qa_case_access(case_id))
    OR (appointment_id IS NOT NULL)
  )
);