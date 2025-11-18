import { supabase } from '@/integrations/supabase/client';

export const updateNadineJacksonIntake = async () => {
  console.log('Updating Nadine Jackson appointment...');
  
  const appointmentId = '5e35b0b3-6b71-4c76-abaa-aa5cb944131e';
  
  const updates = {
    parsed_contact_info: {
      name: "Nadine Jackson",
      phone: "(678) 964-3786",
      email: "ndjackson66@gmail.com",
      address: "112 Maxwell Dr, Warner Robins Georgia 31088"
    },
    parsed_demographics: {
      dob: "1966-04-09",
      age: 59,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Other",
      plan: "102",
      group_number: "174577C2HA",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      pain_level: 10,
      symptoms: "Sharp Pain, Swelling, Stiffness, Dull Ache, Instability or weakness, Grinding sensation",
      treatments_tried: "Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "HyS9x5f7YGpp31amWq50",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/ErI69JZRa2y2cd13K1ld",
    detected_insurance_provider: "Other",
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
    console.error('Error updating Nadine Jackson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Nadine Jackson appointment:', data);
  return { success: true, data };
};
