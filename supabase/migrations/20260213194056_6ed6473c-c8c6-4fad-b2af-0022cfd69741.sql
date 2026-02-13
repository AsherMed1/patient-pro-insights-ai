CREATE POLICY "authenticated_insert_security_audit"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);