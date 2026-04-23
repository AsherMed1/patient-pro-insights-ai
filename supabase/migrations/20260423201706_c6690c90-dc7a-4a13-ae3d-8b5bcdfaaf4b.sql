
-- Add is_superseded column
ALTER TABLE public.all_appointments
ADD COLUMN IF NOT EXISTS is_superseded boolean NOT NULL DEFAULT false;

-- Index for fast filtering in working views
CREATE INDEX IF NOT EXISTS idx_all_appointments_is_superseded
ON public.all_appointments (is_superseded)
WHERE is_superseded = false;

-- Composite index for grouping lookups
CREATE INDEX IF NOT EXISTS idx_all_appointments_grouping
ON public.all_appointments (project_name, ghl_id, lead_phone_number);

-- Function: mark older terminal records as superseded when a newer active record exists
CREATE OR REPLACE FUNCTION public.mark_superseded_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  terminal_statuses text[] := ARRAY['cancelled','canceled','no show','noshow','no-show','rescheduled','do not call','donotcall','oon'];
  is_new_terminal boolean;
  has_active_sibling boolean;
BEGIN
  -- Determine if NEW row is terminal
  is_new_terminal := NEW.status IS NOT NULL
    AND LOWER(TRIM(NEW.status)) = ANY(terminal_statuses);

  IF is_new_terminal THEN
    -- NEW row is terminal: check if an active newer sibling exists; if so, mark NEW superseded.
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
    -- NEW row is active (non-terminal): mark older terminal siblings as superseded.
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
  END IF;

  RETURN NEW;
END;
$function$;

-- BEFORE trigger so we can mutate NEW.is_superseded
DROP TRIGGER IF EXISTS trg_mark_superseded_on_change ON public.all_appointments;
CREATE TRIGGER trg_mark_superseded_on_change
BEFORE INSERT OR UPDATE OF status, ghl_id, lead_phone_number, lead_name, project_name
ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.mark_superseded_on_change();
