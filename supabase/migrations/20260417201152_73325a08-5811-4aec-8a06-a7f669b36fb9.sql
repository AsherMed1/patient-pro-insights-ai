UPDATE public.emr_processing_queue q
SET 
  status = 'completed',
  processed_at = COALESCE(q.processed_at, now()),
  notes = COALESCE(q.notes, '') ||
          CASE WHEN COALESCE(q.notes, '') = '' THEN '' ELSE E'\n' END ||
          'Auto-resolved: appointment ' || a.status || ' (backfill)',
  updated_at = now()
FROM public.all_appointments a
WHERE q.appointment_id = a.id
  AND q.status = 'pending'
  AND LOWER(TRIM(a.status)) IN (
    'cancelled', 'canceled',
    'no show', 'noshow', 'no-show',
    'oon',
    'do not call', 'donotcall',
    'rescheduled',
    'won'
  );