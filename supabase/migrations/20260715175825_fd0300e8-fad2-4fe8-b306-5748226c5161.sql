CREATE OR REPLACE FUNCTION public.mark_superseded_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  terminal_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon'];
  is_new_terminal boolean;
  was_old_terminal boolean;
  has_active_sibling boolean;
  has_newer_active_sibling boolean;
BEGIN
  is_new_terminal := NEW.status IS NOT NULL
    AND LOWER(TRIM(NEW.status)) = ANY(terminal_statuses);

  IF is_new_terminal THEN
    SELECT EXISTS (
      SELECT 1 FROM public.all_appointments sib
      WHERE sib.id <> NEW.id
        AND sib.project_name = NEW.project_name
        AND sib.is_reserved_block = false
        AND COALESCE(sib.is_superseded, false) = false
        AND (
          (NEW.ghl_id IS NOT NULL AND sib.ghl_id = NEW.ghl_id)
          OR (
            NEW.ghl_id IS NULL
            AND NEW.lead_phone_number IS NOT NULL
            AND sib.lead_phone_number = NEW.lead_phone_number
            AND LOWER(TRIM(sib.lead_name)) = LOWER(TRIM(NEW.lead_name))
          )
        )
        AND (sib.status IS NULL OR LOWER(TRIM(sib.status)) <> ALL(terminal_statuses))
        AND sib.created_at > NEW.created_at
    ) INTO has_active_sibling;

    IF has_active_sibling AND COALESCE(NEW.was_ever_confirmed, false) = false THEN
      NEW.is_superseded := true;
    END IF;
  ELSE
    -- NEW row is active (non-terminal)
    UPDATE public.all_appointments older
    SET is_superseded = true,
        updated_at = now()
    WHERE older.id <> NEW.id
      AND older.project_name = NEW.project_name
      AND older.is_reserved_block = false
      AND COALESCE(older.is_superseded, false) = false
      AND COALESCE(older.was_ever_confirmed, false) = false
      AND older.status IS NOT NULL
      AND LOWER(TRIM(older.status)) = ANY(terminal_statuses)
      AND older.created_at < NEW.created_at
      AND (
        (NEW.ghl_id IS NOT NULL AND older.ghl_id = NEW.ghl_id)
        OR (
          NEW.ghl_id IS NULL
          AND NEW.lead_phone_number IS NOT NULL
          AND older.lead_phone_number = NEW.lead_phone_number
          AND LOWER(TRIM(older.lead_name)) = LOWER(TRIM(NEW.lead_name))
        )
      );

    -- NEW SAFEGUARD: if this row is being reactivated out of a terminal state
    -- (Cancelled/No Show/Rescheduled/etc → active) and a newer active sibling
    -- already exists for the same contact, mark NEW as superseded to prevent
    -- resurrecting stale duplicates.
    IF TG_OP = 'UPDATE' THEN
      was_old_terminal := OLD.status IS NOT NULL
        AND LOWER(TRIM(OLD.status)) = ANY(terminal_statuses);

      IF was_old_terminal AND COALESCE(NEW.is_superseded, false) = false THEN
        SELECT EXISTS (
          SELECT 1 FROM public.all_appointments sib
          WHERE sib.id <> NEW.id
            AND sib.project_name = NEW.project_name
            AND sib.is_reserved_block = false
            AND COALESCE(sib.is_superseded, false) = false
            AND (sib.status IS NULL OR LOWER(TRIM(sib.status)) <> ALL(terminal_statuses))
            AND sib.created_at > NEW.created_at
            AND (
              (NEW.ghl_id IS NOT NULL AND sib.ghl_id = NEW.ghl_id)
              OR (
                NEW.ghl_id IS NULL
                AND NEW.lead_phone_number IS NOT NULL
                AND sib.lead_phone_number = NEW.lead_phone_number
                AND LOWER(TRIM(sib.lead_name)) = LOWER(TRIM(NEW.lead_name))
              )
            )
        ) INTO has_newer_active_sibling;

        IF has_newer_active_sibling THEN
          NEW.is_superseded := true;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;