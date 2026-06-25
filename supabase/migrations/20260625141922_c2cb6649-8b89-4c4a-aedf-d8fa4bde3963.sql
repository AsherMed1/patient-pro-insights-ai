UPDATE public.all_appointments
SET
  insurance_id_link = 'https://services.leadconnectorhq.com/documents/download/Hr5uBaMlWQeZxVBRMPpA',
  insurance_back_link = 'https://services.leadconnectorhq.com/documents/download/mypNg9LrlJ2wZpb6j30d',
  parsed_insurance_info = COALESCE(parsed_insurance_info, '{}'::jsonb)
    || jsonb_build_object(
      'secondary_card_front_url', 'https://services.leadconnectorhq.com/documents/download/uEGesNBSitSpduFqOI0Z',
      'secondary_card_url', 'https://services.leadconnectorhq.com/documents/download/uEGesNBSitSpduFqOI0Z',
      'secondary_card_back_url', 'https://services.leadconnectorhq.com/documents/download/zuFbdAzT35e8mqIRudkl'
    )
WHERE id = '6e23e6a5-2d35-411b-952a-28312ed85378';