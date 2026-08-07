-- Relax NOT NULL where needed, then convert blocking FKs to ON DELETE SET NULL
ALTER TABLE public.hipaa_audit_log DROP CONSTRAINT hipaa_audit_log_user_id_fkey;
ALTER TABLE public.hipaa_audit_log ADD CONSTRAINT hipaa_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_sessions DROP CONSTRAINT user_sessions_user_id_fkey;
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.patient_data_access ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.patient_data_access DROP CONSTRAINT patient_data_access_user_id_fkey;
ALTER TABLE public.patient_data_access ADD CONSTRAINT patient_data_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.form_submissions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.form_submissions DROP CONSTRAINT form_submissions_user_id_fkey;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.project_user_access ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE public.project_user_access DROP CONSTRAINT project_user_access_granted_by_fkey;
ALTER TABLE public.project_user_access ADD CONSTRAINT project_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.emr_processing_queue ALTER COLUMN processed_by DROP NOT NULL;
ALTER TABLE public.emr_processing_queue DROP CONSTRAINT emr_processing_queue_processed_by_fkey;
ALTER TABLE public.emr_processing_queue ADD CONSTRAINT emr_processing_queue_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.appointment_reschedules ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE public.appointment_reschedules ALTER COLUMN processed_by DROP NOT NULL;
ALTER TABLE public.appointment_reschedules DROP CONSTRAINT appointment_reschedules_requested_by_fkey;
ALTER TABLE public.appointment_reschedules ADD CONSTRAINT appointment_reschedules_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.appointment_reschedules DROP CONSTRAINT appointment_reschedules_processed_by_fkey;
ALTER TABLE public.appointment_reschedules ADD CONSTRAINT appointment_reschedules_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.task_templates ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.task_templates DROP CONSTRAINT task_templates_created_by_fkey;
ALTER TABLE public.task_templates ADD CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.clinic_onboarding ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.clinic_onboarding DROP CONSTRAINT clinic_onboarding_user_id_fkey;
ALTER TABLE public.clinic_onboarding ADD CONSTRAINT clinic_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.csv_import_batches ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.csv_import_batches DROP CONSTRAINT csv_import_batches_uploaded_by_fkey;
ALTER TABLE public.csv_import_batches ADD CONSTRAINT csv_import_batches_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.account_manager_appointments ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.account_manager_appointments DROP CONSTRAINT account_manager_appointments_uploaded_by_fkey;
ALTER TABLE public.account_manager_appointments ADD CONSTRAINT account_manager_appointments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_transcripts ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.meeting_transcripts DROP CONSTRAINT meeting_transcripts_uploaded_by_fkey;
ALTER TABLE public.meeting_transcripts ADD CONSTRAINT meeting_transcripts_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cpl_data ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.cpl_data DROP CONSTRAINT cpl_data_uploaded_by_fkey;
ALTER TABLE public.cpl_data ADD CONSTRAINT cpl_data_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.quarterly_strategy_submissions ALTER COLUMN submitted_by DROP NOT NULL;
ALTER TABLE public.quarterly_strategy_submissions DROP CONSTRAINT quarterly_strategy_submissions_submitted_by_fkey;
ALTER TABLE public.quarterly_strategy_submissions ADD CONSTRAINT quarterly_strategy_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;