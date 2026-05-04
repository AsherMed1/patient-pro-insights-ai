UPDATE public.all_appointments
SET status = 'Confirmed'
WHERE id = '3c5afa52-5b06-4421-98f7-37f0598098df';

INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
VALUES (
  '3c5afa52-5b06-4421-98f7-37f0598098df',
  'Status restored to "Confirmed" by Lovable Support — prior VA updates were silently blocked by an RLS gap that has now been fixed.',
  'Lovable Support'
);