import { supabase } from '@/integrations/supabase/client';

export const updateWillieRenfroeIntake = async () => {
  console.log('Updating Willie Alan Renfroe appointment...');
  
  const formattedNotes = `Contact: Name: Willie Alan Renfroe | Phone: (478) 357-4367 | Email: renfroe204@gmail.com | DOB: Dec 17th 1959 | Address: 9071 Tennille Oconee Rd, Tennille Georgia 31089 | Patient ID: 3olKmivqR9ejf8UW8Knk /n Insurance: Plan: Humana | Alt Selection: Humana | Notes: Both knees in pain for almost 10 yrs already. Treatment tried are injections / shots and over the counter medication but nothing really help much for the patient. Bone on bone both knees with arthritis on both knees. Can still walk and take stairs but very painful and slow. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: YES | Pain Level: 5 | Symptoms: Dull Ache, Stiffness, Instability or weakness | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '3olKmivqR9ejf8UW8Knk',
    lead_email: 'renfroe204@gmail.com',
    lead_phone_number: '(478) 357-4367',
    dob: '1959-12-17',
    detected_insurance_provider: 'Humana',
    detected_insurance_plan: 'Humana',
    parsed_contact_info: {
      name: 'Willie Alan Renfroe',
      phone: '(478) 357-4367',
      email: 'renfroe204@gmail.com',
      address: '9071 Tennille Oconee Rd, Tennille Georgia 31089',
      patient_id: '3olKmivqR9ejf8UW8Knk'
    },
    parsed_demographics: {
      dob: '1959-12-17',
      age: 65,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Humana',
      plan: 'Humana',
      alternate_selection: 'Humana'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'YES',
      pain_level: 5,
      symptoms: 'Dull Ache, Stiffness, Instability or weakness',
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Willie Alan Renfroe')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Willie Alan Renfroe appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Willie Alan Renfroe appointment:', data);
  return { success: true, data };
};
