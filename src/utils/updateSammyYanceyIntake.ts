import { supabase } from '@/integrations/supabase/client';

export const updateSammyYanceyIntake = async () => {
  console.log('Updating Sammy Yancey Jr appointment...');
  
  const formattedNotes = `Contact: Name: Sammy Yancey Jr | Phone: (229) 425-1085 | DOB: Mar 22nd 1969 | Address: 524 South Main Street, Ashburn Georgia 31714 | Patient ID: JTijn7YuZ91NmJHjFMcM /n Insurance: Plan: Blue Cross and Blue Shield | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/jfETUybxpWtzoeaxKrNv /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'JTijn7YuZ91NmJHjFMcM',
    lead_phone_number: '(229) 425-1085',
    dob: '1969-03-22',
    detected_insurance_provider: 'Blue Cross',
    detected_insurance_plan: 'Blue Cross and Blue Shield',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/jfETUybxpWtzoeaxKrNv',
    parsed_contact_info: {
      name: 'Sammy Yancey Jr',
      phone: '(229) 425-1085',
      address: '524 South Main Street, Ashburn Georgia 31714',
      patient_id: 'JTijn7YuZ91NmJHjFMcM'
    },
    parsed_demographics: {
      dob: '1969-03-22',
      age: 56,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross',
      plan: 'Blue Cross and Blue Shield',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Sammy Yancey Jr')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Sammy Yancey Jr appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sammy Yancey Jr appointment:', data);
  return { success: true, data };
};
