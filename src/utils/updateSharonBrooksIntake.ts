import { supabase } from '@/integrations/supabase/client';

export const updateSharonBrooksIntake = async () => {
  console.log('Updating Sharon Brooks appointment...');
  
  const appointmentId = '1283cfc7-66dc-428b-a95d-87123af2a4b6';
  
  const updates = {
    parsed_contact_info: {
      name: "Sharon Brooks",
      phone: "(478) 951-1319",
      email: "nickiebrooks2000@yahoo.com",
      address: "5723 Lawrence Court, Macon Georgia 31216"
    },
    parsed_demographics: {
      dob: "1969-08-16",
      age: 56,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross Blue Shield federal",
      plan: "Blue Cross Blue Shield federal",
      group_number: "105",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      pain_level: 5,
      symptoms: "Dull Ache, Sharp Pain, Swelling, Stiffness, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "Hcar8F15Er1QavZsARY1",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/71oeyr6wsSxMWJAtVYlK",
    detected_insurance_provider: "Blue Cross Blue Shield federal",
    detected_insurance_plan: "Blue Cross Blue Shield federal",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sharon Brooks appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sharon Brooks appointment:', data);
  return { success: true, data };
};
