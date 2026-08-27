CREATE OR REPLACE FUNCTION public.resolve_potential_oon_on_terminal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text := lower(coalesce(NEW.status, ''));
  v_review text := lower(coalesce(NEW.review_status, ''));
BEGIN
  IF NEW.potential_oon IS TRUE AND NEW.potential_oon_resolved_at IS NULL THEN
    IF v_status IN ('cancelled','canceled','no show','showed','won','oon','do not call','rescheduled')
       OR v_review IN ('oon','declined','dismissed')
       OR NEW.is_superseded IS TRUE THEN
      NEW.potential_oon_resolved_at := now();
      NEW.potential_oon_resolution := COALESCE(
        NEW.potential_oon_resolution,
        CASE
          WHEN v_status = 'oon' OR v_review = 'oon' THEN 'out_of_network'
          ELSE 'closed_' || COALESCE(NULLIF(v_status, ''), NULLIF(v_review, ''), 'terminal')
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_potential_oon_on_terminal ON public.all_appointments;
CREATE TRIGGER trg_resolve_potential_oon_on_terminal
BEFORE INSERT OR UPDATE ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.resolve_potential_oon_on_terminal();

UPDATE public.all_appointments
SET potential_oon_resolved_at = now(),
    potential_oon_resolution = COALESCE(
      potential_oon_resolution,
      CASE WHEN lower(coalesce(status,'')) = 'oon' OR lower(coalesce(review_status,'')) = 'oon'
        THEN 'out_of_network' ELSE 'closed_terminal' END
    )
WHERE potential_oon IS TRUE
  AND potential_oon_resolved_at IS NULL
  AND (
    lower(coalesce(status,'')) IN ('cancelled','canceled','no show','showed','won','oon','do not call','rescheduled')
    OR lower(coalesce(review_status,'')) IN ('oon','declined','dismissed')
    OR is_superseded IS TRUE
    OR (date_of_appointment IS NOT NULL AND date_of_appointment < current_date)
  );