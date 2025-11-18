import { supabase } from '@/integrations/supabase/client';

export const updateJoseOvandoIntake = async () => {
  console.log('Updating Jose Ovando appointment...');
  
  const appointmentId = '0ebed733-0de3-4a5b-bebb-4eb78e7862d3';
  
  const updates = {
    parsed_contact_info: {
      name: "Jose Ovando",
      phone: "(229) 591-9138",
      email: "ovando6574@gmail.com",
      address: "124 Carter Circle, Warner Robins Georgia 31093"
    },
    parsed_demographics: {
      dob: "1969-06-01",
      age: 56,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter Peach State Plan",
      group_number: "2CVA",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Instability or weakness, Sharp Pain, Swelling",
      treatments_tried: "Injections"
    },
    ghl_id: "AHXoKYjW00aXrbhm5vYe",
    detected_insurance_provider: "Ambetter",
    detected_insurance_plan: "Ambetter Peach State Plan",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Jose Ovando appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Jose Ovando appointment:', data);
  return { success: true, data };
};
