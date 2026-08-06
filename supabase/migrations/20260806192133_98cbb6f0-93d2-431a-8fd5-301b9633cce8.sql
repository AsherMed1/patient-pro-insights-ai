ALTER TABLE public.qa_cases
  ADD COLUMN IF NOT EXISTS controlhub_ticket_last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS controlhub_ticket_last_activity text,
  ADD COLUMN IF NOT EXISTS controlhub_ticket_assignee text,
  ADD COLUMN IF NOT EXISTS controlhub_ticket_unread boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controlhub_ticket_seen_at timestamptz;

CREATE TABLE public.qa_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.qa_cases(id) ON DELETE CASCADE,
  ticket_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'comment',
  status text,
  author_name text,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_ticket_events_case ON public.qa_ticket_events(case_id, occurred_at DESC);
CREATE UNIQUE INDEX idx_qa_ticket_events_dedup
  ON public.qa_ticket_events(ticket_id, event_type, occurred_at, md5(coalesce(body, '')));

GRANT SELECT ON public.qa_ticket_events TO authenticated;
GRANT ALL ON public.qa_ticket_events TO service_role;

ALTER TABLE public.qa_ticket_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ticket events for accessible QA cases"
ON public.qa_ticket_events
FOR SELECT
TO authenticated
USING (public.has_qa_case_access(case_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_ticket_events;