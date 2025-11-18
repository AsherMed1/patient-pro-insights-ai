import { supabase } from '@/integrations/supabase/client';

export const updateMichaelBridgersIntake = async () => {
  console.log('Updating Michael Bridgers appointment...');
  
  const appointmentId = '53224a1a-62e4-4883-99b0-c5eb2dfcccc0';
  
  const updates = {
    parsed_contact_info: {
      name: "Michael Bridgers",
      phone: "(478) 832-1261",
      email: "michaelbridgers4@gmail.com",
      address: "874 Ingram Rd, Barnesville Georgia 30204"
    },
    parsed_demographics: {
      dob: "1971-01-12",
      age: 54,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "BCBS PPO",
      plan: "BCBS PPO",
      group_number: "Pb0401",
      alternate_selection: "Blue Cross",
      notes: "Both knees but severe right knee pain. 1 year of pain. Steroid shots in the last 5 years. No imaging done."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Stiffness",
      treatments_tried: "Medications/pain pills",
      imaging_done: "NO",
      notes: "Both knees but right knee is more severe. Pain for 1 year. No treatment this year. Had steroid shots in the last 5 years."
    },
    parsed_medical_info: {
      pcp: "Dr. Whitney Lovett",
      clinic: "Atrium Health Navicent The Medical Center",
      pcp_address: "120 N Lee St, Forsyth GA 31029",
      pcp_phone: "478-994-0437"
    },
    ghl_id: "tw6AubxAjjVSZF6xaEYh",
    detected_insurance_provider: "BCBS PPO",
    detected_insurance_plan: "BCBS PPO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Michael Bridgers appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Michael Bridgers appointment:', data);
  return { success: true, data };
};
