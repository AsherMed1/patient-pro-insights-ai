-- 1. Fix the root cause in DATA: any all_appointments row where ghl_appointment_id
-- is the literal string 'null' (case-insensitive) or 'undefined' should be actual NULL.
-- This prevents future webhooks from matching on the string "null".
UPDATE public.all_appointments
SET ghl_appointment_id = NULL,
    updated_at = now()
WHERE ghl_appointment_id IS NOT NULL
  AND (LOWER(TRIM(ghl_appointment_id)) IN ('null', 'undefined', ''));

UPDATE public.all_appointments
SET ghl_id = NULL,
    updated_at = now()
WHERE ghl_id IS NOT NULL
  AND (LOWER(TRIM(ghl_id)) IN ('null', 'undefined', ''));

UPDATE public.all_appointments
SET calendar_name = 'Unknown',
    updated_at = now()
WHERE calendar_name IS NOT NULL
  AND LOWER(TRIM(calendar_name)) IN ('null', 'undefined');

-- 2. Restore Ashley Caldwell's Richmond Vascular record that was contaminated by
-- the Premier Vascular test webhooks. Her original ghl_id (FBbFcQWsaHNz5QOMDVyM)
-- is preserved; we revert the test-overwritten fields.
UPDATE public.all_appointments
SET 
  -- Restore original phone (still preserved in parsed_contact_info)
  lead_phone_number = '+14342079890',
  -- Clear test DOB
  dob = NULL,
  -- Clear contaminated demographics (will be re-derived from her real data on next parse)
  parsed_demographics = NULL,
  -- Clear contaminated pathology (was overwritten with PAD/GAE test data, original was UFE)
  parsed_pathology_info = NULL,
  -- Clear contaminated insurance (test inserted aetna/123/123)
  parsed_insurance_info = NULL,
  -- Reset parsed_contact_info to re-derive from her real intake notes
  parsed_contact_info = NULL,
  -- Strip the appended test webhook sections from intake notes, keeping only the
  -- original Ashley Caldwell content (everything before the first "THIS IS TEST" section)
  patient_intake_notes = SUBSTRING(
    patient_intake_notes
    FROM 1
    FOR GREATEST(POSITION('THIS IS TEST' IN patient_intake_notes) - 1, 1)
  ),
  -- Force re-parse on next batch
  parsing_completed_at = NULL,
  ghl_location_id = NULL,
  updated_at = now()
WHERE id = 'f160ed1a-2208-4009-b87a-d7271ec707d3';

-- 3. Insert a fresh Premier Vascular unscheduled row for the test lead
-- so the user can verify routing without re-firing the GHL workflow.
-- (Webhook handler fix is separately deployed.)
INSERT INTO public.all_appointments (
  project_name,
  lead_name,
  lead_phone_number,
  lead_email,
  dob,
  ghl_id,
  ghl_appointment_id,
  ghl_location_id,
  status,
  date_of_appointment,
  requested_time,
  date_appointment_created,
  is_unscheduled,
  time_preference,
  internal_process_complete,
  was_ever_confirmed,
  patient_intake_notes,
  calendar_name
) VALUES (
  'Premier Vascular',
  'DONOTCONTACT TESTLEAD',
  '(602) 341-3087',
  NULL,
  '2026-05-01',
  'j4WFc81DrwZCrEUU2feL',
  NULL,
  'AduufAhsgRcAom7enpME',
  'Pending',
  NULL,
  NULL,
  now(),
  true,
  'no_preference',
  false,
  false,
  '**Contact:** address: 17856 W Summerhaven Dr | city: Goodyear | state: Arizona | zip: 85338',
  'Unknown'
)
ON CONFLICT DO NOTHING;