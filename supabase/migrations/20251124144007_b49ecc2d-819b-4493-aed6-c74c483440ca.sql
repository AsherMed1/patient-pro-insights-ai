-- Insert Dr. Rachel TEST appointment into Vivid Vascular
INSERT INTO public.all_appointments (
  project_name,
  lead_name,
  ghl_id,
  ghl_appointment_id,
  lead_email,
  lead_phone_number,
  dob,
  status,
  was_ever_confirmed,
  date_appointment_created,
  patient_intake_notes,
  parsed_contact_info,
  parsed_demographics,
  parsed_insurance_info,
  parsed_pathology_info,
  parsed_medical_info,
  parsing_completed_at
) VALUES (
  'Vivid Vascular',
  'Dr. Rachel TEST',
  'Gk5SPkqeiXRzjBI5kVv0',
  'dH47m0SHCBSHCcMQk48G',
  'rachel@patientpromarketing.com',
  '+12146364222',
  '1960-11-16',
  'confirmed',
  true,
  now(),
  '**Contact:** Name: Dr. Rachel TEST | Phone: (214) 636-4222 | Email: rachel@patientpromarketing.com | DOB: Nov 16th 1960 | Address: 2484 Dove Creek Drive, Fort Worth Texas 76244 | Notes: test | Patient ID: Gk5SPkqeiXRzjBI5kVv0

**Insurance:** Plan: Cigna PPO | Alt Selection: HUMANA | Notes: Had ultrasound at urologist office

**Pathology (PAE):** BPH Duration: 6 months to 1 year ago | Symptoms: Weak urine stream, Dribbling or difficulty starting urination, Feeling like your bladder doesn''t fully empty | Quality of Life: ☑️ YES | Treatments: UroLift (prostate sutures/staples), Laser surgery | Improved w/ Treatment?: Somewhat | Less Invasive Option Desired: ☑️ YES | Aware of PAE: ❌ NO | Surgery Next Step: ☑️ YES',
  jsonb_build_object(
    'name', 'Dr. Rachel TEST',
    'phone', '(214) 636-4222',
    'email', 'rachel@patientpromarketing.com',
    'address', '2484 Dove Creek Drive, Fort Worth Texas 76244',
    'patient_id', 'Gk5SPkqeiXRzjBI5kVv0',
    'notes', 'test'
  ),
  jsonb_build_object(
    'dob', 'Nov 16th 1960',
    'age', 64,
    'gender', 'Unknown'
  ),
  jsonb_build_object(
    'primary_plan', 'Cigna PPO',
    'alternate_selection', 'HUMANA',
    'notes', 'Had ultrasound at urologist office'
  ),
  jsonb_build_object(
    'procedure_type', 'PAE',
    'primary_complaint', 'BPH',
    'duration', '6 months to 1 year ago',
    'symptoms', array['Weak urine stream', 'Dribbling or difficulty starting urination', 'Feeling like your bladder doesn''t fully empty'],
    'quality_of_life_impact', 'YES',
    'previous_treatments', array['UroLift (prostate sutures/staples)', 'Laser surgery'],
    'treatment_effectiveness', 'Somewhat',
    'less_invasive_desired', 'YES',
    'aware_of_pae', 'NO',
    'surgery_next_step', 'YES'
  ),
  jsonb_build_object(
    'previous_treatments', array['UroLift (prostate sutures/staples)', 'Laser surgery']
  ),
  now()
);