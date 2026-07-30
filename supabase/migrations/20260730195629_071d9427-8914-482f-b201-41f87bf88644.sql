CREATE OR REPLACE FUNCTION public.supersede_on_review_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  terminal_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon'];
  superseded_ids uuid[];
  new_date_text text;
BEGIN
  -- Only act on pending -> approved transitions
  IF COALESCE(LOWER(TRIM(OLD.review_status)), '') <> 'pending' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(LOWER(TRIM(NEW.review_status)), '') <> 'approved' THEN
    RETURN NEW;
  END IF;

  -- Skip reserved/superseded rows
  IF COALESCE(NEW.is_reserved_block, false) = true OR COALESCE(NEW.is_superseded, false) = true THEN
    RETURN NEW;
  END IF;

  -- Find older active sibling rows to supersede
  SELECT array_agg(id)
  INTO superseded_ids
  FROM public.all_appointments older
  WHERE older.id <> NEW.id
    AND older.project_name = NEW.project_name
    AND older.is_reserved_block = false
    AND COALESCE(older.is_superseded, false) = false
    AND older.created_at < NEW.created_at
    AND (
      (NEW.ghl_id IS NOT NULL AND older.ghl_id = NEW.ghl_id)
      OR (
        NEW.ghl_id IS NULL
        AND NEW.lead_phone_number IS NOT NULL
        AND older.lead_phone_number = NEW.lead_phone_number
        AND LOWER(TRIM(COALESCE(older.lead_name, ''))) = LOWER(TRIM(COALESCE(NEW.lead_name, '')))
      )
    )
    AND (older.status IS NULL OR LOWER(TRIM(older.status)) <> ALL(terminal_statuses))
    AND (
      older.review_status IS NULL
      OR LOWER(TRIM(older.review_status)) = 'approved'
    );

  IF superseded_ids IS NULL OR array_length(superseded_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mark siblings superseded
  UPDATE public.all_appointments
  SET is_superseded = true,
      updated_at = now()
  WHERE id = ANY(superseded_ids);

  -- Add audit notes on superseded rows
  new_date_text := COALESCE(NEW.date_of_appointment::text, 'unscheduled');
  INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
  SELECT id,
         'Superseded by newer approved Review Queue appointment ' || NEW.id::text || ' on ' || new_date_text || ' — System',
         'System'
  FROM unnest(superseded_ids) AS id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_supersede_on_review_approval ON public.all_appointments;
CREATE TRIGGER trg_supersede_on_review_approval
BEFORE UPDATE OF review_status ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.supersede_on_review_approval();