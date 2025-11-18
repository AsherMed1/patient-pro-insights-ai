import { supabase } from '@/integrations/supabase/client';

export const updateSterlingAycockIntake = async () => {
  console.log('Updating Sterling Aycock appointment...');
  
  const appointmentId = '1471a046-43ec-482b-b302-8405adc27c76';
  
  const updates = {
    parsed_contact_info: {
      name: "Sterling Aycock",
      phone: "(478) 457-7576",
      address: "553 Browns Crossing Road Northwest, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1960-03-07",
      age: 65,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Medicare Part A and Part B",
      plan: "Medicare Part A and Part B",
      alternate_selection: "Medicare",
      secondary_insurance: "UHC Plan G ACE",
      policy_number: "2401041466",
      notes: "Right knee, left knee replaced 2017. Weights 400 pounds. No injury. Due for replacement."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Sharp Pain, Dull Ache, Stiffness, Swelling, Instability or weakness",
      treatments_tried: "Knee replacement, Injections, Physical therapy",
      imaging_done: "YES",
      notes: "Right knee. Left knee replaced in 2017. Patient weighs 400 pounds and is due for replacement."
    },
    parsed_medical_info: {
      pcp: "Dr. Charles Driver",
      clinic: "Presbyterian Hospital",
      pcp_phone: "478-453-0662"
    },
    ghl_id: "NdNXvkT5rA5NaleNl21J",
    detected_insurance_provider: "Medicare Part A and Part B",
    detected_insurance_plan: "Medicare Part A and Part B",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sterling Aycock appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sterling Aycock appointment:', data);
  return { success: true, data };
};
