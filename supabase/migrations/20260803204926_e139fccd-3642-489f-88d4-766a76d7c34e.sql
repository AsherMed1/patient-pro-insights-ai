CREATE OR REPLACE FUNCTION public.merge_older_active_siblings(new_row public.all_appointments)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  terminal_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon','showed','won'];
  superseded_ids uuid[];
  new_date_text text;
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
      OR older.date_of_appointment <= new_row.date_of_appointment
    );

  IF superseded_ids IS NULL OR array_length(superseded_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.all_appointments
  SET is_superseded = true,
      updated_at = now()
  WHERE id = ANY(superseded_ids);

  new_date_text := COALESCE(new_row.date_of_appointment::text, 'unscheduled');

  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  SELECT id,
         'Superseded by newer approved appointment ' || new_row.id::text || ' on ' || new_date_text || ' — System',
         'System'
  FROM unnest(superseded_ids) AS id;

  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  VALUES (
    new_row.id,
    'Replaced ' || array_length(superseded_ids, 1)::text || ' earlier appointment record(s) for this patient on approval — System',
    'System'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.supersede_on_review_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(LOWER(TRIM(OLD.review_status)), '') <> 'pending' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(LOWER(TRIM(NEW.review_status)), '') <> 'approved' THEN
    RETURN NEW;
  END IF;

  PERFORM public.merge_older_active_siblings(NEW);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.supersede_on_approved_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(LOWER(TRIM(NEW.review_status)), '') <> 'approved' THEN
    RETURN NEW;
  END IF;

  PERFORM public.merge_older_active_siblings(NEW);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_supersede_on_approved_insert ON public.all_appointments;
CREATE TRIGGER trg_supersede_on_approved_insert
AFTER INSERT ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.supersede_on_approved_insert();