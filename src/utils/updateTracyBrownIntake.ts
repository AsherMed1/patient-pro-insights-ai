import { supabase } from '@/integrations/supabase/client';

export const updateTracyBrownIntake = async () => {
  console.log('Updating Tracy Brown appointment...');
  
  const formattedNotes = `Contact: Name: Tracy Brown | Phone: (478) 454-7431 | Email: tlbrown091969@gmail.com | DOB: Sep 19th 1969 | Address: 249 E Court Dr SW, Atlanta Georgia 30331 | Patient ID: om2raHDMypVFBLxGGhll /n Insurance: Plan: Anthem | Group #: L12688M001 | Alt Selection: Other | Notes: Both knees, PT helps sometimes, 1 year, No injury /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: NO | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 8 | Symptoms: Dull Ache, Sharp Pain, Instability or weakness, Stiffness, Swelling | Treatments Tried: Medications/pain pills | Imaging Done: NO | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'om2raHDMypVFBLxGGhll',
    lead_email: 'tlbrown091969@gmail.com',
    lead_phone_number: '(478) 454-7431',
    dob: '1969-09-19',
    detected_insurance_provider: 'Anthem',
    detected_insurance_plan: 'Anthem',
    detected_insurance_id: 'L12688M001',
    parsed_contact_info: {
      name: 'Tracy Brown',
      phone: '(478) 454-7431',
      email: 'tlbrown091969@gmail.com',
      address: '249 E Court Dr SW, Atlanta Georgia 30331',
      patient_id: 'om2raHDMypVFBLxGGhll'
    },
    parsed_demographics: {
      dob: '1969-09-19',
      age: 55,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Anthem',
      plan: 'Anthem',
      group_number: 'L12688M001',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'NO',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 8,
      primary_complaint: 'Bilateral knee pain',
      symptoms: 'Dull Ache, Sharp Pain, Instability or weakness, Stiffness, Swelling',
      treatments_tried: 'Medications/pain pills, Physical therapy',
      imaging_done: 'NO',
      other: 'NO',
      notes: 'Both knees affected. Physical therapy helps sometimes. 1 year duration. No injury history.'
    },
    parsed_medical_info: {
      treatments_tried: 'Medications/pain pills, Physical therapy',
      notes: 'Bilateral knee pain for 1 year with no trauma history. Physical therapy provides intermittent relief. Currently managed with pain medications. No imaging performed to date.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Tracy Brown')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Tracy Brown appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tracy Brown appointment:', data);
  return { success: true, data };
};
