import { supabase } from '@/integrations/supabase/client';

export const updateShirleyLeeIntake = async () => {
  console.log('Updating Shirley Lee appointment...');
  
  const formattedNotes = `Contact: Name: Shirley Lee | Phone: (229) 603-9120 | Email: blackchina35@yahoo.com | DOB: Dec 8th 1970 | Address: 389 Thompson Ave, Ashburn Georgia 31714 | Patient ID: 6gjnZaGdxyFjlNFRy74x /n Insurance: Plan: UMR | Group #: 76412524 | Alt Selection: Other /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: NO | Age Range: 46 to 55 | Trauma-related Onset: YES | Pain Level: 5 | Symptoms: Dull Ache, Sharp Pain, Swelling, Stiffness | Treatments Tried: Medications/pain pills, Physical therapy | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '6gjnZaGdxyFjlNFRy74x',
    lead_email: 'blackchina35@yahoo.com',
    lead_phone_number: '(229) 603-9120',
    dob: '1970-12-08',
    detected_insurance_provider: 'UMR',
    detected_insurance_plan: 'UMR',
    detected_insurance_id: '76412524',
    parsed_contact_info: {
      name: 'Shirley Lee',
      phone: '(229) 603-9120',
      email: 'blackchina35@yahoo.com',
      address: '389 Thompson Ave, Ashburn Georgia 31714',
      patient_id: '6gjnZaGdxyFjlNFRy74x'
    },
    parsed_demographics: {
      dob: '1970-12-08',
      age: 54,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'UMR',
      plan: 'UMR',
      group_number: '76412524',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'NO',
      age_range: '46 to 55',
      trauma_related_onset: 'YES',
      pain_level: 5,
      symptoms: 'Dull Ache, Sharp Pain, Swelling, Stiffness',
      treatments_tried: 'Medications/pain pills, Physical therapy',
      imaging_done: 'YES',
      other: 'NO'
    },
    parsed_medical_info: {
      treatments_tried: 'Medications/pain pills, Physical therapy',
      imaging_status: 'Completed',
      notes: 'Trauma-related knee pain managed with conservative treatment including pain medications and physical therapy.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Shirley Lee')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Shirley Lee appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Shirley Lee appointment:', data);
  return { success: true, data };
};
