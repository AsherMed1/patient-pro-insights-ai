
-- Fix the cleanup_security_tables function to have an immutable search_path
DROP FUNCTION IF EXISTS public.cleanup_security_tables();

CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_deleted INTEGER := 0;
  deleted_count INTEGER;
BEGIN
  -- Clean expired portal sessions
  DELETE FROM public.project_portal_sessions 
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean old rate limit entries (older than 24 hours)
  DELETE FROM public.rate_limit_log 
  WHERE window_start < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Clean old audit logs (older than 90 days)
  DELETE FROM public.security_audit_log 
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$;
