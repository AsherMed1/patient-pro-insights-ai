import { supabase } from '@/integrations/supabase/client';

export const updateCirieHandIntake = async () => {
  console.log('Updating Cirie Hand appointment...');
  
  const appointmentId = '130f45db-c3e5-48dc-8dec-f39aedfb2136';
  
  const updates = {
    parsed_contact_info: {
      name: "Cirie Hand",
      phone: "(678) 588-1035",
      email: "cdhand53@gmail.com",
      address: "156 Glen Echo Dr, Jackson Georgia 30233"
    },
    parsed_demographics: {
      dob: "1953-11-18",
      age: 72,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare PPO",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES"
    },
    ghl_id: "o8AyrngnpHWgA84tOLNL",
    detected_insurance_provider: "United Healthcare",
    detected_insurance_plan: "United Healthcare PPO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Cirie Hand appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Cirie Hand appointment:', data);
  return { success: true, data };
};
