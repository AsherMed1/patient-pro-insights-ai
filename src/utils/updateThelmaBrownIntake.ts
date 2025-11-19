import { supabase } from '@/integrations/supabase/client';

export const updateThelmaBrownIntake = async () => {
  console.log('Updating Thelma Brown appointment...');
  
  const formattedNotes = `Contact: Name: Thelma Brown | Phone: (478) 418-3809 | Email: thelmaw193@gmail.com | DOB: Apr 30th 1958 | Address: 4789 West Oak Court, Macon Georgia 31210 | Patient ID: 8vjRcG9chCnu8euEIUXC /n Insurance: Plan: 96731707800 | Group #: 01173H3256003000 | Alt Selection: United Healthcare /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 5 | Symptoms: Stiffness | Treatments Tried: Other (please specify below) | Imaging Done: NO | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '8vjRcG9chCnu8euEIUXC',
    lead_email: 'thelmaw193@gmail.com',
    lead_phone_number: '(478) 418-3809',
    dob: '1958-04-30',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: '96731707800',
    parsed_contact_info: {
      name: 'Thelma Brown',
      phone: '(478) 418-3809',
      email: 'thelmaw193@gmail.com',
      address: '4789 West Oak Court, Macon Georgia 31210',
      patient_id: '8vjRcG9chCnu8euEIUXC'
    },
    parsed_demographics: {
      dob: '1958-04-30',
      age: 67,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: '96731707800',
      group_number: '01173H3256003000',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 5,
      symptoms: 'Stiffness',
      treatments_tried: 'Other (please specify below)',
      imaging_done: 'NO'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Thelma Brown')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Thelma Brown appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Thelma Brown appointment:', data);
  return { success: true, data };
};
