import { supabase } from '@/integrations/supabase/client';

export const updateDionJonesIntake = async () => {
  console.log('Updating DION JONES appointment...');
  
  const formattedNotes = `Contact: Name: DION JONES | Phone: (478) 747-6255 | Email: ddtyler@gmail.com | DOB: Aug 10th 1973 | Address: 150 Birch Avenue, Warner Robins Georgia 31093 | Patient ID: NJPTVMrne3l6Xp9jsq0T /n Insurance: Plan: A00020258APU | Group #: 78-800-489 | Alt Selection: United Healthcare /n Pathology: GAE - Duration: 1-6 months | OA or TKR Diagnosed: YES | Age Range: 46 to 55`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'NJPTVMrne3l6Xp9jsq0T',
    lead_email: 'ddtyler@gmail.com',
    lead_phone_number: '(478) 747-6255',
    dob: '1973-08-10',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'A00020258APU',
    detected_insurance_id: '78-800-489',
    parsed_contact_info: {
      name: 'DION JONES',
      phone: '(478) 747-6255',
      email: 'ddtyler@gmail.com',
      address: '150 Birch Avenue, Warner Robins Georgia 31093',
      patient_id: 'NJPTVMrne3l6Xp9jsq0T'
    },
    parsed_demographics: {
      dob: '1973-08-10',
      age: 51,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'A00020258APU',
      group_number: '78-800-489',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: '1-6 months',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'DION JONES')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating DION JONES appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated DION JONES appointment:', data);
  return { success: true, data };
};
