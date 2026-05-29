-- Review_only role policies: read appointments, update review fields, write review history and notes
CREATE POLICY "Review_only view all appointments"
ON public.all_appointments
FOR SELECT
USING (public.has_role(auth.uid(), 'review_only'::public.app_role));

CREATE POLICY "Review_only update appointments for review"
ON public.all_appointments
FOR UPDATE
USING (public.has_role(auth.uid(), 'review_only'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'review_only'::public.app_role));

CREATE POLICY "Review_only view review history"
ON public.appointment_review_history
FOR SELECT
USING (public.has_role(auth.uid(), 'review_only'::public.app_role));

CREATE POLICY "Review_only insert review history"
ON public.appointment_review_history
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'review_only'::public.app_role));

CREATE POLICY "Review_only insert appointment notes"
ON public.appointment_notes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'review_only'::public.app_role));

CREATE POLICY "Review_only view appointment notes"
ON public.appointment_notes
FOR SELECT
USING (public.has_role(auth.uid(), 'review_only'::public.app_role));