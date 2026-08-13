ALTER TABLE public.qa_case_notes ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS qa_case_notes_update ON public.qa_case_notes;
CREATE POLICY qa_case_notes_update ON public.qa_case_notes
FOR UPDATE
USING (has_qa_case_access(case_id) AND (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (has_qa_case_access(case_id) AND (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS qa_case_notes_delete ON public.qa_case_notes;
CREATE POLICY qa_case_notes_delete ON public.qa_case_notes
FOR DELETE
USING (has_qa_case_access(case_id) AND (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));