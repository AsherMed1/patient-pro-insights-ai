-- Allow VAs to update appointments (was missing — caused silent no-op updates)
CREATE POLICY "VA update all appointments"
  ON public.all_appointments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'va'))
  WITH CHECK (public.has_role(auth.uid(), 'va'));

-- Allow VAs to insert appointments
CREATE POLICY "VA insert all appointments"
  ON public.all_appointments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'va'));

-- Allow VAs to delete appointments
CREATE POLICY "VA delete all appointments"
  ON public.all_appointments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'va'));