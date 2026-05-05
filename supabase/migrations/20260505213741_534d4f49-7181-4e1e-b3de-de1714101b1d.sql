UPDATE public.all_appointments
SET time_preference = 'morning', updated_at = now()
WHERE id = '9806c839-6d0b-4518-97b8-595d721e59c7'
  AND (time_preference IS NULL OR time_preference = 'no_preference');