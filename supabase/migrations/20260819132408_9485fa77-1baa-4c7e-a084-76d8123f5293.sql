ALTER TABLE public.recapture_cases DROP CONSTRAINT IF EXISTS recapture_cases_work_status_check;

ALTER TABLE public.recapture_cases
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_note text,
  ADD COLUMN IF NOT EXISTS completion_reason text;

ALTER TABLE public.recapture_cases ALTER COLUMN work_status SET DEFAULT 'new';

UPDATE public.recapture_cases SET work_status = 'new' WHERE work_status = 'pending';
UPDATE public.recapture_cases SET work_status = 'nurture' WHERE work_status = 'engaging';
UPDATE public.recapture_cases SET work_status = 'follow_up' WHERE work_status = 'follow_up_required';

ALTER TABLE public.recapture_cases
  ADD CONSTRAINT recapture_cases_work_status_check
  CHECK (work_status IN ('new','nurture','follow_up','completed'));