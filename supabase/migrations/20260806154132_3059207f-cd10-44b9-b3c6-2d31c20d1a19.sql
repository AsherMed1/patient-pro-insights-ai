CREATE OR REPLACE FUNCTION public.merge_older_active_siblings(new_row all_appointments)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  terminal_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon','showed','won'];
  superseded_ids uuid[];
  new_date_text text;
  new_time time := COALESCE(new_row.requested_time, TIME '00:00');
BEGIN
  IF COALESCE(new_row.is_reserved_block, false) = true OR COALESCE(new_row.is_superseded, false) = true THEN
    RETURN;
  END IF;

  SELECT array_agg(older.id)
  INTO superseded_ids
  FROM public.all_appointments older
  WHERE older.id <> new_row.id
    AND older.project_name = new_row.project_name
    AND COALESCE(older.is_reserved_block, false) = false
    AND COALESCE(older.is_superseded, false) = false
    AND older.created_at < new_row.created_at
    AND (
      (new_row.ghl_id IS NOT NULL AND older.ghl_id = new_row.ghl_id)
      OR (
        new_row.ghl_id IS NULL
        AND new_row.lead_phone_number IS NOT NULL
        AND older.lead_phone_number = new_row.lead_phone_number
        AND LOWER(TRIM(COALESCE(older.lead_name, ''))) = LOWER(TRIM(COALESCE(new_row.lead_name, '')))
      )
    )
    AND (older.status IS NULL OR LOWER(TRIM(older.status)) <> ALL(terminal_statuses))
    AND (
      older.review_status IS NULL
      OR LOWER(TRIM(older.review_status)) IN ('approved', 'pending')
    )
    AND (
      new_row.date_of_appointment IS NULL
      OR older.date_of_appointment IS NULL
      OR older.date_of_appointment < new_row.date_of_appointment
      -- Same date: compare times. Only retire a sibling at or before the
      -- approved row's time; a later same-day slot stays for human review.
      OR (
        older.date_of_appointment = new_row.date_of_appointment
        AND COALESCE(older.requested_time, TIME '00:00') <= new_time
      )
    );

  IF superseded_ids IS NULL OR array_length(superseded_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.all_appointments
  SET is_superseded = true,
      updated_at = now()
  WHERE id = ANY(superseded_ids);

  new_date_text := COALESCE(new_row.date_of_appointment::text, 'unscheduled')
    || CASE WHEN new_row.requested_time IS NULL THEN '' ELSE ' at ' || to_char(new_row.requested_time, 'HH12:MI AM') END;

  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  SELECT a.id,
         'Superseded by newer approved appointment ' || new_row.id::text || ' on ' || new_date_text
           || '. This record'
           || CASE WHEN a.date_of_appointment IS NULL THEN ' had no scheduled date.'
                   ELSE ' was ' || a.date_of_appointment::text
                        || CASE WHEN a.requested_time IS NULL THEN '' ELSE ' at ' || to_char(a.requested_time, 'HH12:MI AM') END
                        || '.' END
           || ' — System',
         'System'
  FROM public.all_appointments a
  WHERE a.id = ANY(superseded_ids);

  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  VALUES (
    new_row.id,
    'Replaced ' || array_length(superseded_ids, 1)::text || ' earlier appointment record(s) for this patient on approval (this booking: ' || new_date_text || ') — System',
    'System'
  );
END;
$function$;