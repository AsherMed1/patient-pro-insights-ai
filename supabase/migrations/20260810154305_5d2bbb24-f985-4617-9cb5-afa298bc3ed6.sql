ALTER TABLE public.qa_cases DROP CONSTRAINT IF EXISTS qa_cases_alert_type_check;
ALTER TABLE public.qa_cases ADD CONSTRAINT qa_cases_alert_type_check
  CHECK (alert_type = ANY (ARRAY['short_notice','oon','cancelled','no_show','confirmed_audit','review_queue','potential_oon']));

ALTER TABLE public.all_appointments DROP CONSTRAINT IF EXISTS all_appointments_review_stage_check;
ALTER TABLE public.all_appointments ADD CONSTRAINT all_appointments_review_stage_check
  CHECK (review_stage = ANY (ARRAY['new','pending_review','qa_hold']));