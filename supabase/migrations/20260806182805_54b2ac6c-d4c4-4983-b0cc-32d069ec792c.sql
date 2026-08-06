CREATE TABLE public.qa_note_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.qa_case_notes(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.qa_cases(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  mentioned_by_user_id uuid,
  mentioned_by_name text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_note_mentions_user_unread ON public.qa_note_mentions (mentioned_user_id, read_at, created_at DESC);
CREATE INDEX idx_qa_note_mentions_note ON public.qa_note_mentions (note_id);

GRANT SELECT, INSERT, UPDATE ON public.qa_note_mentions TO authenticated;
GRANT ALL ON public.qa_note_mentions TO service_role;

ALTER TABLE public.qa_note_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own mentions"
ON public.qa_note_mentions FOR SELECT TO authenticated
USING (mentioned_user_id = auth.uid() OR mentioned_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users mark their own mentions read"
ON public.qa_note_mentions FOR UPDATE TO authenticated
USING (mentioned_user_id = auth.uid())
WITH CHECK (mentioned_user_id = auth.uid());

CREATE POLICY "Case viewers can create mentions"
ON public.qa_note_mentions FOR INSERT TO authenticated
WITH CHECK (public.has_qa_case_access(case_id) AND mentioned_by_user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_note_mentions;