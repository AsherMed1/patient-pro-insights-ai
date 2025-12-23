-- Support System Tables for Modern Chat Widget

-- Support Conversations table
CREATE TABLE public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ai' CHECK (type IN ('ai', 'live_agent', 'ticket')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting_agent', 'resolved', 'archived')),
  user_email TEXT,
  user_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  assigned_agent UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support Messages table (for conversations)
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'agent', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support Tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  ticket_number TEXT UNIQUE,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT,
  created_by_email TEXT NOT NULL,
  created_by_name TEXT,
  assigned_agent UUID,
  conversation_id UUID REFERENCES public.support_conversations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Help Articles table
CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Help Videos table
CREATE TABLE public.help_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'Getting Started',
  duration TEXT,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_conversations
CREATE POLICY "Users can view conversations for their projects"
ON public.support_conversations FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = support_conversations.project_name
  ))
);

CREATE POLICY "Users can create conversations"
ON public.support_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their conversations"
ON public.support_conversations FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = support_conversations.project_name
  ))
);

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_conversations sc
    WHERE sc.id = support_messages.conversation_id
    AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'agent') OR
      (has_role(auth.uid(), 'project_user') AND EXISTS (
        SELECT 1 FROM project_user_access pua
        JOIN projects p ON pua.project_id = p.id
        WHERE pua.user_id = auth.uid() AND p.project_name = sc.project_name
      ))
    )
  )
);

CREATE POLICY "Users can create messages"
ON public.support_messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for support_tickets
CREATE POLICY "Users can view tickets for their projects"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = support_tickets.project_name
  ))
);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tickets for their projects"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'agent') OR
  (has_role(auth.uid(), 'project_user') AND EXISTS (
    SELECT 1 FROM project_user_access pua
    JOIN projects p ON pua.project_id = p.id
    WHERE pua.user_id = auth.uid() AND p.project_name = support_tickets.project_name
  ))
);

-- RLS Policies for help_articles (public read, admin write)
CREATE POLICY "Anyone can view published help articles"
ON public.help_articles FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage help articles"
ON public.help_articles FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for help_videos (public read, admin write)
CREATE POLICY "Anyone can view published help videos"
ON public.help_videos FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage help videos"
ON public.help_videos FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_support_conversations_project ON public.support_conversations(project_name);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_messages_conversation ON public.support_messages(conversation_id);
CREATE INDEX idx_support_tickets_project ON public.support_tickets(project_name);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_help_articles_category ON public.help_articles(category);
CREATE INDEX idx_help_videos_category ON public.help_videos(category);

-- Trigger for updated_at
CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_videos_updated_at
  BEFORE UPDATE ON public.help_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

-- Trigger to auto-generate ticket number
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

-- Insert some default help articles
INSERT INTO public.help_articles (title, content, category, order_index) VALUES
('How do I view my appointments?', 'Navigate to the Appointments tab to see all your scheduled appointments. You can filter by status, date, and other criteria.', 'Getting Started', 1),
('How do I update appointment status?', 'Click on any appointment card to open the details view. From there you can update the status, add notes, and manage tags.', 'Appointments', 2),
('What do the different statuses mean?', 'Confirmed: Patient confirmed appointment. Showed: Patient attended. No Show: Patient did not attend. Cancelled: Appointment was cancelled.', 'Appointments', 3),
('How do I contact support?', 'Use this chat widget to reach our support team. Start with our AI assistant, and you can escalate to a live agent if needed.', 'Support', 4),
('How do I submit a support ticket?', 'Click on the Tickets tab and select "New Ticket". Fill in the subject, description, and priority level.', 'Support', 5);

-- Insert some default help videos
INSERT INTO public.help_videos (title, description, video_url, category, duration, order_index) VALUES
('Getting Started Overview', 'A quick tour of the main features and how to navigate the portal.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Getting Started', '5:30', 1),
('Managing Appointments', 'Learn how to view, filter, and update appointment information.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Appointments', '8:15', 2),
('Understanding Analytics', 'Deep dive into the analytics dashboard and key metrics.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Analytics', '6:45', 3);