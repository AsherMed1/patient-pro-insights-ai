-- 1. Dedicated reporting schema for external read-only consumers (Claude via MCP)
CREATE SCHEMA IF NOT EXISTS reporting;

-- 2. Read-only role. No password is set here; an admin sets one before use.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'claude_reader') THEN
    CREATE ROLE claude_reader NOLOGIN;
  END IF;
END $$;

-- 3. Appointment summary (excludes superseded rows)
CREATE OR REPLACE VIEW reporting.appointment_summary AS
SELECT
  a.id,
  a.project_name,
  a.lead_name                AS patient_name,
  a.status,
  a.procedure_status,
  a.procedure_ordered,
  a.calendar_name,
  a.date_of_appointment,
  a.requested_time,
  a.time_preference,
  a.is_unscheduled,
  a.created_at,
  a.date_appointment_created,
  a.review_status,
  a.review_stage,
  a.reviewed_at,
  a.pending_since,
  a.internal_process_complete,
  a.was_ever_confirmed,
  a.cancellation_reason,
  a.decline_reason,
  a.reschedule_eligible,
  a.reschedule_block_reason,
  a.potential_oon,
  a.potential_oon_flagged_at,
  a.potential_oon_resolved_at,
  a.potential_oon_resolution,
  a.short_notice_auto_tagged_at,
  a.welcome_call_state,
  a.welcome_call_attempt_count,
  a.welcome_call_first_attempt_at,
  a.welcome_call_last_attempt_at,
  a.welcome_call_reached_at,
  a.welcome_call_completed,
  a.detected_insurance_provider,
  a.detected_insurance_plan,
  a.parsing_completed_at,
  a.updated_at
FROM public.all_appointments a
WHERE COALESCE(a.is_superseded, false) = false
  AND COALESCE(a.is_reserved_block, false) = false;

-- 4. QA case summary
CREATE OR REPLACE VIEW reporting.qa_case_summary AS
SELECT
  q.id,
  q.appointment_id,
  q.project_name,
  q.patient_name,
  q.service_line,
  q.appointment_date,
  q.appointment_status,
  q.alert_type,
  q.workflow_status,
  q.qa_name,
  q.self_booked,
  q.error_category,
  q.error_source,
  q.caught_before_clinic,
  q.resolution_type,
  q.date_resolved,
  q.escalation_status,
  q.escalated_at,
  q.ticket_created,
  q.controlhub_ticket_status,
  q.first_entered_at,
  q.entered_queue_at,
  q.review_started_at,
  q.review_entered_at,
  q.review_resolved_at,
  q.completed_at,
  q.appointment_created_at,
  q.created_at,
  q.updated_at
FROM public.qa_cases q;

-- 5. Recapture funnel
CREATE OR REPLACE VIEW reporting.recapture_funnel AS
SELECT
  r.id,
  r.appointment_id,
  r.project_name,
  r.patient_name,
  r.service_line,
  r.lost_type,
  r.lost_status_at_entry,
  r.appointment_date,
  r.entered_worklist_at,
  r.work_status,
  r.work_started_at,
  r.outcome,
  r.completion_reason,
  r.completed_at,
  r.rebooked_appointment_id,
  r.recovered,
  r.stale,
  r.attempt_count,
  r.first_attempt_at,
  r.last_attempt_at,
  r.follow_up_at,
  r.created_at,
  r.updated_at
FROM public.recapture_cases r;

-- 6. Welcome call compliance, aggregated per clinic
CREATE OR REPLACE VIEW reporting.welcome_call_compliance AS
SELECT
  a.project_name,
  date_trunc('week', a.date_of_appointment)::date AS appointment_week,
  count(*)                                                          AS appointments,
  count(*) FILTER (WHERE a.welcome_call_attempt_count > 0)           AS with_attempt,
  count(*) FILTER (WHERE a.welcome_call_reached_at IS NOT NULL)      AS reached,
  count(*) FILTER (WHERE a.welcome_call_state = 'no_answer')         AS no_answer,
  count(*) FILTER (WHERE COALESCE(a.welcome_call_completed, false))  AS marked_completed,
  sum(COALESCE(a.welcome_call_attempt_count, 0))                     AS total_attempts
FROM public.all_appointments a
WHERE COALESCE(a.is_superseded, false) = false
  AND COALESCE(a.is_reserved_block, false) = false
  AND a.date_of_appointment IS NOT NULL
GROUP BY 1, 2;

-- 7. Grants: claude_reader may read these four views and nothing else.
GRANT USAGE ON SCHEMA reporting TO claude_reader;
GRANT SELECT ON reporting.appointment_summary    TO claude_reader;
GRANT SELECT ON reporting.qa_case_summary        TO claude_reader;
GRANT SELECT ON reporting.recapture_funnel       TO claude_reader;
GRANT SELECT ON reporting.welcome_call_compliance TO claude_reader;

-- Explicitly deny everything else reachable by default.
REVOKE ALL ON SCHEMA public FROM claude_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting GRANT SELECT ON TABLES TO claude_reader;

COMMENT ON SCHEMA reporting IS 'Read-only curated views for external consumers (Claude via Supabase MCP). Queried by the claude_reader role only.';