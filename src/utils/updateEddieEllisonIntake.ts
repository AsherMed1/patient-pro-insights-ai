import { supabase } from '@/integrations/supabase/client';

export const updateEddieEllisonIntake = async () => {
  console.log('Updating Eddie Bernard Ellison appointment...');
  
  const appointmentId = '3becfffd-c44d-4989-a6c4-742c8a4a6a3f';
  
  const updates = {
    parsed_contact_info: {
      name: "Eddie Bernard Ellison",
      phone: "(478) 457-5280",
      email: "eddieell@charter.net",
      address: "135 Harvest Court unit 201, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1953-06-16",
      age: 72,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Medicare",
      plan: "Medicare",
      alternate_selection: "Medicare",
      notes: "TRICARE for Life"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above"
    },
    ghl_id: "2QIsPC5CUID8nONv5fOr",
    detected_insurance_provider: "Medicare",
    detected_insurance_plan: "Medicare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Eddie Bernard Ellison appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Eddie Bernard Ellison appointment:', data);
  return { success: true, data };
};
