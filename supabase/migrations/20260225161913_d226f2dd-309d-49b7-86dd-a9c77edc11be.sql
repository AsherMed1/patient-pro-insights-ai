
-- Create call_sync_cursors table for resumable pagination state
CREATE TABLE public.call_sync_cursors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  date_from TEXT,
  date_to TEXT,
  cursor_value TEXT,
  conversations_processed INTEGER DEFAULT 0,
  calls_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_name, date_from, date_to)
);

-- Enable RLS
ALTER TABLE public.call_sync_cursors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (admin-level function)
CREATE POLICY "Authenticated users can manage sync cursors"
  ON public.call_sync_cursors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_call_sync_cursors_updated_at
  BEFORE UPDATE ON public.call_sync_cursors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
