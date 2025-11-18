import { supabase } from '@/integrations/supabase/client';

export const updateMarieKearseIntake = async () => {
  console.log('Updating Marie Kearse appointment...');
  
  const appointmentId = 'ba92f934-73d3-4c64-89d5-68413b216fa7';
  
  const updates = {
    parsed_contact_info: {
      name: "Marie Kearse",
      phone: "(907) 723-3763",
      email: "tundrat05@yahoo.com",
      address: "902 Avenue St, McDonough Georgia 30253"
    },
    parsed_demographics: {
      dob: "1965-04-05",
      age: 60,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross",
      plan: "102",
      group_number: "917800",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      trauma_related_onset: "YES",
      age_range: "56 and above",
      pain_level: 8,
      symptoms: "Dull Ache, Swelling, Sharp Pain, Grinding sensation, Stiffness"
    },
    ghl_id: "oMUtRQG1alQGvbJJy0yF",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/3EaGISbLXNFYBUjQgtTk",
    detected_insurance_provider: "Blue Cross",
    detected_insurance_plan: "102",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Marie Kearse appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Marie Kearse appointment:', data);
  return { success: true, data };
};
