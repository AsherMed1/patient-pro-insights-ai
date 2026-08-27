CREATE TABLE public.recapture_case_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.recapture_cases(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  channel text,
  result text,
  conversation_outcome text,
  actor_user_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.recapture_case_activity TO authenticated;
GRANT ALL ON public.recapture_case_activity TO service_role;

ALTER TABLE public.recapture_case_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recapture_activity_select" ON public.recapture_case_activity
  FOR SELECT TO authenticated
  USING (public.has_recapture_case_access(case_id));

CREATE POLICY "recapture_activity_insert" ON public.recapture_case_activity
  FOR INSERT TO authenticated
  WITH CHECK (public.has_recapture_case_access(case_id));

CREATE INDEX idx_recapture_activity_created_at ON public.recapture_case_activity(created_at DESC);
CREATE INDEX idx_recapture_activity_case_id ON public.recapture_case_activity(case_id);

-- Backfill: opens
INSERT INTO public.recapture_case_activity (case_id, activity_type, description, actor_user_id, actor_name, created_at)
SELECT c.id, 'opened', 'Record opened', c.opened_by, c.opened_by_name, c.opened_at
FROM public.recapture_cases c
WHERE c.opened_at IS NOT NULL;

-- Backfill: claims/assignments
INSERT INTO public.recapture_case_activity (case_id, activity_type, description, actor_user_id, created_at)
SELECT c.id, 'assignment', 'Record claimed', c.assigned_user_id, COALESCE(c.work_started_at, c.opened_at, c.entered_worklist_at)
FROM public.recapture_cases c
WHERE c.assigned_user_id IS NOT NULL;

-- Backfill: completions
INSERT INTO public.recapture_case_activity (case_id, activity_type, description, actor_user_id, created_at)
SELECT c.id, 'completed', COALESCE('Completed — ' || c.completion_reason, 'Completed'), c.completed_by, c.completed_at
FROM public.recapture_cases c
WHERE c.completed_at IS NOT NULL;

-- Backfill: outreach attempts
INSERT INTO public.recapture_case_activity (case_id, activity_type, description, channel, result, conversation_outcome, actor_user_id, actor_name, created_at)
SELECT a.case_id, 'attempt', 'Outreach attempt logged', a.channel, a.result, a.conversation_outcome, a.user_id, a.user_name, a.attempted_at
FROM public.recapture_attempts a;

-- Backfill: follow-ups currently scheduled
INSERT INTO public.recapture_case_activity (case_id, activity_type, description, actor_user_id, created_at)
SELECT c.id, 'follow_up_scheduled', 'Follow-up scheduled', c.assigned_user_id, COALESCE(c.last_attempt_at, c.updated_at)
FROM public.recapture_cases c
WHERE c.follow_up_at IS NOT NULL;