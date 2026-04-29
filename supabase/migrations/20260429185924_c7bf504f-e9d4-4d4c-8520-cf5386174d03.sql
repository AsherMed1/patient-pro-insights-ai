-- VA: read all appointment notes
CREATE POLICY "VA_view_appointment_notes"
ON public.appointment_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'va'));

-- VA: edit any appointment note
CREATE POLICY "VA_update_appointment_notes"
ON public.appointment_notes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'va'))
WITH CHECK (public.has_role(auth.uid(), 'va'));

-- VA: delete any appointment note
CREATE POLICY "VA_delete_appointment_notes"
ON public.appointment_notes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'va'));