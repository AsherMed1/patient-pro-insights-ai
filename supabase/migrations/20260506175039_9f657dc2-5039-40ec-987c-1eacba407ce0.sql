UPDATE public.all_appointments
SET requested_time='13:00:00',
    status='Confirmed',
    internal_process_complete=false,
    was_ever_confirmed=true,
    reschedule_history = COALESCE(reschedule_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'previous_date','2026-05-25',
      'previous_time','14:00:00',
      'new_date','2026-05-25',
      'new_time','13:00:00',
      'changed_at', now()::text,
      'previous_status','Scheduled',
      'source','manual_correction'
    )),
    updated_at=now()
WHERE id='79d230e6-07f9-49f7-88e2-f3258f92f8eb';

INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
VALUES ('79d230e6-07f9-49f7-88e2-f3258f92f8eb',
        'Rescheduled | FROM: 2026-05-25 14:00:00 | TO: 2026-05-25 13:00:00 | By: System (corrected to match GoHighLevel)',
        'System');