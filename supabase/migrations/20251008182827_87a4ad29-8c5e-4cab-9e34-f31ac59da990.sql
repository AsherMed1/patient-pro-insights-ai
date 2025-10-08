-- Enhanced audit log table with all required fields
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  entity text NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can see all logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can see their own logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (user_id = auth.uid());

-- Service role can insert logs
CREATE POLICY "Service can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_entity text,
  p_action text,
  p_description text,
  p_source text DEFAULT 'manual',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
  current_user_name text;
BEGIN
  -- Get user name from profiles if available
  SELECT full_name INTO current_user_name
  FROM public.profiles
  WHERE id = auth.uid();
  
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    entity,
    action,
    description,
    source,
    metadata
  ) VALUES (
    auth.uid(),
    COALESCE(current_user_name, 'Unknown User'),
    p_entity,
    p_action,
    p_description,
    p_source,
    p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;