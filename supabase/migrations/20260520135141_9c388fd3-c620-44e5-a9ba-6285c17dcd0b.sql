
-- Apply retroactive reschedule for AVA / Cory Hammond (fcbd47d0-8c6b-4c5b-a661-53fc5a75e6fb)
-- GHL was updated to 2026-05-18 @ 14:00 but the Appointment Update webhook never fired,
-- so the portal still shows the original 2026-05-11 @ 16:00. Reconcile manually.

UPDATE public.all_appointments
SET
  date_of_appointment = '2026-05-18',
  requested_time = '14:00:00',
  reschedule_history = COALESCE(reschedule_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'from_date', '2026-05-11',
      'from_time', '16:00:00',
      'to_date', '2026-05-18',
      'to_time', '14:00:00',
      'rescheduled_at', now(),
      'rescheduled_by', 'System (manual GHL reconciliation)',
      'reason', 'GHL Appointment Update webhook never fired; portal manually reconciled to match GHL'
    )
  ),
  updated_at = now()
WHERE id = 'fcbd47d0-8c6b-4c5b-a661-53fc5a75e6fb';

-- Internal note documenting the reconciliation and flagging the AVA GHL workflow check
INSERT INTO public.appointment_notes (appointment_id, note_text, created_by)
VALUES (
  'fcbd47d0-8c6b-4c5b-a661-53fc5a75e6fb',
  'System reconciliation: Clinic rescheduled this appointment in GHL to May 18, 2026 @ 2:00 PM, but the GHL Appointment Update webhook never fired, so the portal continued to show May 11 @ 4:00 PM. Date/time updated manually to match GHL. ACTION: AVA sub-account (pdt30sKeaaBubLsO1OM3) GHL automation workflow with trigger "Appointment Status Updated / Appointment Updated" should be audited — if missing or paused, future AVA reschedules will silently drift.',
  NULL
);
