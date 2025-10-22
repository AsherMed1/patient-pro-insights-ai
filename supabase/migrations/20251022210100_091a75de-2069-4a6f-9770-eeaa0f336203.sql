-- Create project_messages table for 2-way chat
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT CHECK (sender_type IN ('team', 'system', 'user', 'agent')),
  sender_name TEXT,
  sender_email TEXT,
  patient_reference JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_project_messages_project ON public.project_messages(project_name);
CREATE INDEX idx_project_messages_created ON public.project_messages(created_at DESC);
CREATE INDEX idx_project_messages_direction ON public.project_messages(direction);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for projects they have access to
CREATE POLICY "Users can view project messages"
  ON public.project_messages FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'agent') OR
    (has_role(auth.uid(), 'project_user') AND EXISTS (
      SELECT 1 FROM public.project_user_access pua
      JOIN public.projects p ON pua.project_id = p.id
      WHERE pua.user_id = auth.uid() AND p.project_name = project_messages.project_name
    ))
  );

-- Policy: Authenticated users can insert messages for their projects
CREATE POLICY "Users can insert project messages"
  ON public.project_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'agent') OR
    (has_role(auth.uid(), 'project_user') AND EXISTS (
      SELECT 1 FROM public.project_user_access pua
      JOIN public.projects p ON pua.project_id = p.id
      WHERE pua.user_id = auth.uid() AND p.project_name = project_messages.project_name
    ))
  );

-- Policy: Service role can manage all messages (for webhook)
CREATE POLICY "Service role manages messages"
  ON public.project_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for live chat updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;