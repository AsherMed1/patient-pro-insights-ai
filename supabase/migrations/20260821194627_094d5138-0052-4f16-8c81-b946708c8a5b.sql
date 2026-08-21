UPDATE public.all_appointments
SET is_superseded = true
WHERE id = '51e1e13a-8843-4006-8258-5e19536209bc'
  AND is_superseded = false;

INSERT INTO public.appointment_notes (appointment_id, note_text, created_by, visibility)
VALUES (
  '51e1e13a-8843-4006-8258-5e19536209bc',
  'Retired as a duplicate — GoHighLevel replayed the original Aug 19, 9:30 AM booking after it had already been rescheduled to Sep 24, 1:00 PM (record 61714adc). The Sep 24 appointment is the live one — System',
  'System',
  'internal'
);