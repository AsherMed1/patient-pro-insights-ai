import { supabase } from '@/integrations/supabase/client';

export const updateGregoryLockettIntake = async () => {
  console.log('Updating Gregory Lockett appointment...');
  
  const appointmentId = '29f73f2c-1c71-4a01-874d-85a9eca08f33';
  
  const updates = {
    parsed_contact_info: {
      name: "Gregory Lockett",
      phone: "(478) 979-8788",
      email: "lockettgregory13@gmail.com",
      address: "1314 Courtland Ave, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1961-10-25",
      age: 64,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      alternate_selection: "United"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Sharp Pain",
      treatments_tried: "Injections",
      imaging_done: "YES"
    },
    ghl_id: "s7vqTqZIvO7OVeKnCGwB",
    detected_insurance_provider: "United Healthcare",
    detected_insurance_plan: "United Healthcare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Gregory Lockett appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Gregory Lockett appointment:', data);
  return { success: true, data };
};
