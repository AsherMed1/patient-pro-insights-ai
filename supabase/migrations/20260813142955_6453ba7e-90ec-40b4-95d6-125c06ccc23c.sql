CREATE OR REPLACE FUNCTION public.merge_appointment_insurance_cards(
  _appointment_id uuid,
  _primary_front text DEFAULT NULL,
  _primary_back text DEFAULT NULL,
  _secondary_front text DEFAULT NULL,
  _secondary_back text DEFAULT NULL,
  _allow_primary_pair_correction boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated boolean;
BEGIN
  UPDATE public.all_appointments AS a
  SET
    insurance_id_link = CASE
      WHEN NULLIF(a.insurance_id_link, '') IS NULL AND NULLIF(_primary_front, '') IS NOT NULL
        THEN _primary_front
      WHEN _allow_primary_pair_correction
        AND NULLIF(_primary_front, '') IS NOT NULL
        AND NULLIF(_primary_back, '') IS NOT NULL
        AND NULLIF(a.insurance_id_link, '') IS NOT NULL
        AND NULLIF(a.insurance_back_link, '') IS NOT NULL
        AND ARRAY[a.insurance_id_link, a.insurance_back_link] @> ARRAY[_primary_front, _primary_back]
        AND ARRAY[_primary_front, _primary_back] @> ARRAY[a.insurance_id_link, a.insurance_back_link]
        THEN _primary_front
      ELSE a.insurance_id_link
    END,
    insurance_back_link = CASE
      WHEN NULLIF(a.insurance_back_link, '') IS NULL AND NULLIF(_primary_back, '') IS NOT NULL
        THEN _primary_back
      WHEN _allow_primary_pair_correction
        AND NULLIF(_primary_front, '') IS NOT NULL
        AND NULLIF(_primary_back, '') IS NOT NULL
        AND NULLIF(a.insurance_id_link, '') IS NOT NULL
        AND NULLIF(a.insurance_back_link, '') IS NOT NULL
        AND ARRAY[a.insurance_id_link, a.insurance_back_link] @> ARRAY[_primary_front, _primary_back]
        AND ARRAY[_primary_front, _primary_back] @> ARRAY[a.insurance_id_link, a.insurance_back_link]
        THEN _primary_back
      ELSE a.insurance_back_link
    END,
    parsed_insurance_info =
      CASE
        WHEN NULLIF(_secondary_front, '') IS NOT NULL
          AND NULLIF(COALESCE(a.parsed_insurance_info, '{}'::jsonb)->>'secondary_card_front_url', '') IS NULL
          THEN jsonb_set(COALESCE(a.parsed_insurance_info, '{}'::jsonb), '{secondary_card_front_url}', to_jsonb(_secondary_front), true)
        ELSE COALESCE(a.parsed_insurance_info, '{}'::jsonb)
      END,
    updated_at = now()
  WHERE a.id = _appointment_id
  RETURNING true INTO _updated;

  IF COALESCE(_updated, false) AND NULLIF(_secondary_back, '') IS NOT NULL THEN
    UPDATE public.all_appointments AS a
    SET parsed_insurance_info = jsonb_set(
      COALESCE(a.parsed_insurance_info, '{}'::jsonb),
      '{secondary_card_back_url}',
      to_jsonb(_secondary_back),
      true
    )
    WHERE a.id = _appointment_id
      AND NULLIF(COALESCE(a.parsed_insurance_info, '{}'::jsonb)->>'secondary_card_back_url', '') IS NULL;
  END IF;

  RETURN COALESCE(_updated, false);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_appointment_insurance_cards(uuid, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_appointment_insurance_cards(uuid, text, text, text, text, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.preserve_appointment_insurance_card_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.parsed_insurance_info ? 'secondary_card_front_url'
     AND NOT COALESCE(NEW.parsed_insurance_info, '{}'::jsonb) ? 'secondary_card_front_url' THEN
    NEW.parsed_insurance_info := jsonb_set(
      COALESCE(NEW.parsed_insurance_info, '{}'::jsonb),
      '{secondary_card_front_url}',
      OLD.parsed_insurance_info->'secondary_card_front_url',
      true
    );
  END IF;

  IF OLD.parsed_insurance_info ? 'secondary_card_back_url'
     AND NOT COALESCE(NEW.parsed_insurance_info, '{}'::jsonb) ? 'secondary_card_back_url' THEN
    NEW.parsed_insurance_info := jsonb_set(
      COALESCE(NEW.parsed_insurance_info, '{}'::jsonb),
      '{secondary_card_back_url}',
      OLD.parsed_insurance_info->'secondary_card_back_url',
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_appointment_insurance_card_keys_trigger ON public.all_appointments;
CREATE TRIGGER preserve_appointment_insurance_card_keys_trigger
BEFORE UPDATE OF parsed_insurance_info ON public.all_appointments
FOR EACH ROW
EXECUTE FUNCTION public.preserve_appointment_insurance_card_keys();