INSERT INTO public.all_appointments (
  date_appointment_created, lead_name, project_name, lead_email, lead_phone_number,
  calendar_name, ghl_id, ghl_location_id, dob, status, was_ever_confirmed,
  internal_process_complete, is_unscheduled, is_reserved_block, time_preference,
  review_status, reviewed_at, review_notes,
  detected_insurance_provider, detected_insurance_plan, detected_insurance_id,
  parsed_contact_info, parsed_demographics, parsed_insurance_info,
  parsed_medical_info, parsed_pathology_info, parsing_completed_at,
  patient_intake_notes
) VALUES (
  '2026-05-17', 'Rebecca Patton', 'ECCO Medical', 'rebeccapatton2017@gmail.com', '+17207301133',
  'Unknown', 'POaJ8KKfwU11nVpN4o5K', 'zIAE5uvAIFsR89pli60f', '1967-02-15', 'Confirmed', true,
  false, true, false, 'afternoon',
  'approved', now(), 'Restored from audit snapshot after accidental cascade delete',
  'Humana Gold/Medicare Advantage', '2B170', 'Humana Gold',
  '{"address":"West Tennessee Avenue, Denver, Colorado, 80219","dob":"1967-02-15","email":"rebeccapatton2017@gmail.com","name":"Rebecca Patton","phone":"+17207301133"}'::jsonb,
  '{"age":59,"dob":"1967-02-15","gender":null}'::jsonb,
  '{"insurance_group_number":"H67817186","insurance_id_number":"Humana Gold","insurance_notes":null,"insurance_plan":"2B170","insurance_provider":"Humana Gold/Medicare Advantage"}'::jsonb,
  '{"allergies":null,"imaging_details":"YES","imaging_facility":null,"imaging_location":null,"imaging_phone":null,"imaging_when":null,"medications":null,"pcp_name":"Dr Patricia Horvata 720 263 64094","pcp_phone":null,"xray_details":null}'::jsonb,
  '{"affected_area":null,"affected_knee":null,"age_range":"56 and above","duration":"Over 1 year","imaging_done":null,"location":"Lone Tree","oa_tkr_diagnosed":"YES","pain_level":10,"previous_treatments":"Injections, Physical therapy, Medications/pain pills","primary_complaint":null,"procedure_type":"GAE","symptoms":"Dull Ache, Sharp Pain, Grinding sensation, Instability or weakness, Stiffness"}'::jsonb,
  now(),
  $intake$**Contact:** address: West Tennessee Avenue | city: Denver | state: Colorado | zip: 80219

=== GHL Contact Data (Full) ===

Contact Information:
  First Name: Rebecca
  Last Name: Patton
  Full Name: Rebecca Patton
  Email: rebeccapatton2017@gmail.com
  Phone: +17207301133
  Date of Birth: 1967-02-15
  Address: West Tennessee Avenue
  City: Denver
  State: Colorado
  Postal Code: 80219
  Country: US
  Service Name: GAE

Insurance Information:
  Please select your insurance provider: Humana Gold/Medicare Advantage
  Insurance ID Number: Humana Gold
  Insurance Plan: 2B170
  Insurance Group Number: H67817186

Pathology Information:
  GAE STEP 1 | How long have you been experiencing knee pain?: Over 1 year
  GAE STEP 1 | How old are you?: 56 and above
  GAE STEP 1 | Have you ever been diagnosed with knee osteoarthritis?: YES
  GAE STEP 2 | Did your symptoms begin after a recent trauma/injury to the knee?: NO
  GAE STEP 2 | Have you had a knee X-ray or MRI or CT?: YES
  GAE STEP 2 | Have you had unresolved fever and chills?: NO
  GAE STEP 2 | Describe the symptoms you are experiencing.: Dull Ache, Sharp Pain, Grinding sensation, Instability or weakness, Stiffness
  GAE STEP 2 | On a scale of 1-10 how severe is your pain?: 10
  GAE STEP 2 | What treatments have you tried for your knee pain?: Injections, Physical therapy, Medications/pain pills
  Time Preference: Afternoon

Medical Information:
  Primary Care Doctor Name and Phone: Dr Patricia Horvata 720 263 64094

Additional Information:
  Location Picker: Lone Tree
  Stage Booked: Day 1 PM
  Had Imaging Before?: YES
$intake$
);