
CREATE POLICY "VA view all projects" ON public.projects FOR SELECT USING (has_role(auth.uid(), 'va'::app_role));
CREATE POLICY "VA view all appointments" ON public.all_appointments FOR SELECT USING (has_role(auth.uid(), 'va'::app_role));
CREATE POLICY "VA view all calls" ON public.all_calls FOR SELECT USING (has_role(auth.uid(), 'va'::app_role));
CREATE POLICY "VA view all leads" ON public.new_leads FOR SELECT USING (has_role(auth.uid(), 'va'::app_role));
