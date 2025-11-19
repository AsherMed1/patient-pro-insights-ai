import { supabase } from '@/integrations/supabase/client';

export const updateKevinDuffyIntake = async () => {
  console.log('Updating Kevin Duffy appointment...');
  
  const formattedNotes = `Contact: Name: Kevin Duffy | Phone: (470) 227-5004 | DOB: Sep 20th 1976 | Address: 704 Willow Chase Dr, McDonough Georgia 30253 | Patient ID: aJfe8j3idWR7WAEsMswm /n Insurance: Plan: Humana | Alt Selection: Humana | Notes: He is not sure if it is an HMO or PPO. Humana (accepted). can drop by location. R knee mainly in pain, but now its both. R knee is bone on bone. dealing w knee pain for 6 months. tried everything (for treatments) - didnt help much. had imaging done, last one was done around 3 months ago at Elite Radiology. his knee pain is severe sharp, and hurts all the time. knee brace is not working. walking hurts. PCP: doesnt know the name, but its Aylo Clinic at Stockbridge, GA. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'aJfe8j3idWR7WAEsMswm',
    lead_phone_number: '(470) 227-5004',
    dob: '1976-09-20',
    detected_insurance_provider: 'Humana',
    detected_insurance_plan: 'Humana',
    parsed_contact_info: {
      name: 'Kevin Duffy',
      phone: '(470) 227-5004',
      address: '704 Willow Chase Dr, McDonough Georgia 30253',
      patient_id: 'aJfe8j3idWR7WAEsMswm'
    },
    parsed_demographics: {
      dob: '1976-09-20',
      age: 49,
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
      age_range: '46 to 55'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Kevin Duffy')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Kevin Duffy appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Kevin Duffy appointment:', data);
  return { success: true, data };
};
