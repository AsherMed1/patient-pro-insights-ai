import { supabase } from '@/integrations/supabase/client';

export const updateMelbaMitchellIntake = async () => {
  console.log('Updating Melba Mitchell appointment...');
  
  const formattedNotes = `Contact: Name: Melba Mitchell | Phone: (229) 938-8456 | Email: melba.a.mitchell@outlook.com | DOB: Sep 29th 1971 | Address: 111 ABBY GAIL Ln, Perry Georgia 31069 | Patient ID: qWIgEsNFAIywUPXTExMH /n Insurance: Plan: BCBS | Alt Selection: Blue Cross /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: YES | Pain Level: 7 | Symptoms: Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'qWIgEsNFAIywUPXTExMH',
    lead_email: 'melba.a.mitchell@outlook.com',
    lead_phone_number: '(229) 938-8456',
    dob: '1971-09-29',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'BCBS',
    parsed_contact_info: {
      name: 'Melba Mitchell',
      phone: '(229) 938-8456',
      email: 'melba.a.mitchell@outlook.com',
      address: '111 ABBY GAIL Ln, Perry Georgia 31069',
      patient_id: 'qWIgEsNFAIywUPXTExMH'
    },
    parsed_demographics: {
      dob: '1971-09-29',
      age: 53,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'BCBS',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'YES',
      pain_level: 7,
      symptoms: 'Dull Ache, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Melba Mitchell')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Melba Mitchell appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Melba Mitchell appointment:', data);
  return { success: true, data };
};
