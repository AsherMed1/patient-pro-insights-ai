-- Clear all appointment data for fresh start while preserving schema

-- Delete all appointment records from main tables
DELETE FROM public.appointment_tags;
DELETE FROM public.appointment_notes;
DELETE FROM public.all_appointments;
DELETE FROM public.appointments;

-- Reset appointment-related fields in other tables
UPDATE public.new_leads SET appt_date = NULL WHERE appt_date IS NOT NULL;

UPDATE public.agent_performance_stats 
SET 
  booked_appointments = 0,
  appts_to_take_place = 0,
  shows = 0,
  no_shows = 0,
  show_rate = 0
WHERE booked_appointments > 0 OR appts_to_take_place > 0 OR shows > 0 OR no_shows > 0;