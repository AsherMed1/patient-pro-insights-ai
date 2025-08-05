-- Remove unused columns from new_leads table

ALTER TABLE public.new_leads DROP COLUMN IF EXISTS card_image;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS knee_pain_duration;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS symptoms_description;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS knee_treatments_tried;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS heel_pain_duration;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS heel_pain_exercise_frequency;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS plantar_fasciitis_treatments;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS knee_osteoarthritis_diagnosis;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS gae_candidate;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS trauma_injury_onset;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS pain_severity_scale;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS fever_chills;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS knee_imaging;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS heel_morning_pain;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS heel_pain_improves_rest;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS plantar_fasciitis_mobility_impact;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS plantar_fasciitis_imaging;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS parsed_insurance_info;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS parsed_pathology_info;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS parsed_contact_info;
ALTER TABLE public.new_leads DROP COLUMN IF EXISTS parsed_demographics;