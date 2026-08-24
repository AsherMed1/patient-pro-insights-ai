-- Recapture cases: opened tracking, follow-up timezone, booking attribution
ALTER TABLE public.recapture_cases
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opened_by_name text,
  ADD COLUMN IF NOT EXISTS follow_up_timezone text,
  ADD COLUMN IF NOT EXISTS booked_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booked_by_name text,
  ADD COLUMN IF NOT EXISTS conversation_outcome text;

ALTER TABLE public.recapture_cases DROP CONSTRAINT IF EXISTS recapture_cases_work_status_check;
ALTER TABLE public.recapture_cases ADD CONSTRAINT recapture_cases_work_status_check
  CHECK (work_status = ANY (ARRAY['new','opened','nurture','follow_up','completed']));

ALTER TABLE public.recapture_cases DROP CONSTRAINT IF EXISTS recapture_cases_outcome_check;
ALTER TABLE public.recapture_cases ADD CONSTRAINT recapture_cases_outcome_check
  CHECK (outcome = ANY (ARRAY['rebooked','interested','unable_to_reach','declined_rebook','scheduled_elsewhere','not_interested','dnc_requested','invalid_contact','wrong_number','booked_rescheduled','other']));

-- Recapture attempts: conversation outcome + booking attribution + text/email results
ALTER TABLE public.recapture_attempts
  ADD COLUMN IF NOT EXISTS conversation_outcome text,
  ADD COLUMN IF NOT EXISTS booked_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booked_by_name text;

ALTER TABLE public.recapture_attempts DROP CONSTRAINT IF EXISTS recapture_attempts_result_check;
ALTER TABLE public.recapture_attempts ADD CONSTRAINT recapture_attempts_result_check
  CHECK (result = ANY (ARRAY[
    'answered','voicemail','no_answer','busy','disconnected','wrong_number',
    'callback_requested','not_interested','other',
    'text_sent','text_responded','text_failed',
    'email_sent','email_responded','email_failed'
  ]));

CREATE INDEX IF NOT EXISTS idx_recapture_cases_follow_up_at ON public.recapture_cases (follow_up_at) WHERE follow_up_at IS NOT NULL;