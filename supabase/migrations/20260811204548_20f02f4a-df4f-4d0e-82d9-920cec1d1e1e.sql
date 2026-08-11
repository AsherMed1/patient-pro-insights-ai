ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portal_tour_completed_at timestamptz;

UPDATE public.profiles SET portal_tour_completed_at = now() WHERE portal_tour_completed_at IS NULL;