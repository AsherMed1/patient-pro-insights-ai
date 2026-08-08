ALTER TABLE public.qa_ticket_events
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound';