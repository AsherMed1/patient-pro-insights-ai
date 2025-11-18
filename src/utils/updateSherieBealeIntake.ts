import { supabase } from '@/integrations/supabase/client';

export const updateSherieBealeIntake = async () => {
  console.log('Updating Sherie Beale appointment...');
  
  const appointmentId = '398c66e0-6cdc-45f5-a9f8-525860b99931';
  
  const updates = {
    parsed_contact_info: {
      name: "Sherie Beale",
      phone: "(678) 860-8557",
      email: "sheriebeale@gmail.com",
      address: "3205 Granada Trail, Locust Grove Georgia 30248"
    },
    parsed_demographics: {
      dob: "1973-11-11",
      age: 52,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ppo",
      plan: "Ppo",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "1-6 months",
      age_range: "46 to 55",
      pain_level: 10,
      symptoms: "Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills, Physical therapy"
    },
    ghl_id: "qHnz19UpocCVKh4NvnY3",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/Kb18n2grGtC3V27Niy4C",
    detected_insurance_provider: "Ppo",
    detected_insurance_plan: "Ppo",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sherie Beale appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sherie Beale appointment:', data);
  return { success: true, data };
};
