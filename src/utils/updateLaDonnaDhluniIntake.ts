import { supabase } from '@/integrations/supabase/client';

export const updateLaDonnaDhluniIntake = async () => {
  console.log('Updating La Donna Dhluni appointment...');
  
  const formattedNotes = `Contact: Name: La Donna Dhluni | Phone: (478) 330-1166 | Email: blaqberrijazz@gmail.com | DOB: Feb 24th 1971 | Address: 266 Box Springs Trail, Beaumont California 92223 | Patient ID: Lgd9vS0jkV3en4PAoU92 /n Insurance: Plan: BCBS | Group #: 183138 | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/cluYB32bUIxbhOdY1625 /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: YES | Pain Level: 8 | Symptoms: Sharp Pain, Stiffness, Instability or weakness, Dull Ache | Treatments Tried: Physical therapy, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'Lgd9vS0jkV3en4PAoU92',
    lead_email: 'blaqberrijazz@gmail.com',
    lead_phone_number: '(478) 330-1166',
    dob: '1971-02-24',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'BCBS',
    detected_insurance_id: '183138',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/cluYB32bUIxbhOdY1625',
    parsed_contact_info: {
      name: 'La Donna Dhluni',
      phone: '(478) 330-1166',
      email: 'blaqberrijazz@gmail.com',
      address: '266 Box Springs Trail, Beaumont California 92223',
      patient_id: 'Lgd9vS0jkV3en4PAoU92'
    },
    parsed_demographics: {
      dob: '1971-02-24',
      age: 53,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'BCBS',
      group_number: '183138',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'YES',
      pain_level: 8,
      symptoms: 'Sharp Pain, Stiffness, Instability or weakness, Dull Ache',
      treatments_tried: 'Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'La Donna Dhluni')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating La Donna Dhluni appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated La Donna Dhluni appointment:', data);
  return { success: true, data };
};
