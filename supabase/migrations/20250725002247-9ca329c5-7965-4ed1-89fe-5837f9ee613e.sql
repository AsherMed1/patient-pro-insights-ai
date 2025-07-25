-- Add missing public read policy for new_leads
CREATE POLICY "Public read new_leads"
ON public.new_leads
FOR SELECT
USING (true);

-- Also ensure anon role specifically has access by granting usage on public schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;