CREATE POLICY "VA_insert_appointment_notes"
ON public.appointment_notes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'va'::app_role));