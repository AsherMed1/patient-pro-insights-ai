import { supabase } from '@/integrations/supabase/client';

export const updateTrescaGreenIntake = async () => {
  console.log('Updating Tresca Green appointment...');
  
  const appointmentId = 'ef73bc57-2a6f-4076-b22c-77a9bc22b2dd';
  
  const updates = {
    parsed_contact_info: {
      name: "Tresca Green",
      phone: "(478) 250-4472",
      address: "1868 Sussex Drive, Macon Georgia 31206"
    },
    parsed_demographics: {
      dob: "1972-01-02",
      age: 53,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      alternate_selection: "Lincoln Financial",
      notes: "Both knees but right is worse"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      notes: "Both knees but right is worse"
    },
    parsed_medical_info: {
      pcp: "Dr Jordon",
      clinic: "Southern Primary Care",
      pcp_phone: "478-743-8316",
      imaging_location: "Piedmont Hospital Macon",
      imaging_done: "MRI taken 2 weeks ago"
    },
    ghl_id: "NO6psEgzgyfxOCoeEWpP",
    detected_insurance_provider: "Ambetter",
    detected_insurance_plan: "Ambetter",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Tresca Green appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tresca Green appointment:', data);
  return { success: true, data };
};
