import { supabase } from '@/integrations/supabase/client';

export const updateLindaFranklinIntake = async () => {
  console.log('Updating Linda Franklin appointment...');
  
  const appointmentId = '5a95590c-d631-41cc-89e1-7becf1a764b2';
  
  const updates = {
    parsed_contact_info: {
      name: "Linda Franklin",
      phone: "(478) 251-1171",
      email: "ldfranklin2010@yahoo.com",
      address: "90 Old Mill Court, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1953-09-27",
      age: 72,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Anthem Blue Cross Blue Shield PPO",
      plan: "Anthem Blue Cross Blue Shield PPO",
      group_number: "GAEGR000",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Stiffness, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Knee replacement, Medications/pain pills",
      imaging_done: "YES",
      primary_complaint: "Right knee pain",
      notes: "Left had knee replacement. Pain started Dec last year. Using ice packs, had injection 5th Sept - seems worse after that. Walk, going up and down stairs is hard. Pain wakes her up."
    },
    parsed_medical_info: {
      pcp: "Dr. Rashmi hooda",
      pcp_phone: "478-453-9472",
      pcp_location: "GA"
    },
    ghl_id: "CP04fXTojW0GzDwVCzv1",
    detected_insurance_provider: "Anthem Blue Cross Blue Shield PPO",
    detected_insurance_plan: "Anthem Blue Cross Blue Shield PPO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Linda Franklin appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Linda Franklin appointment:', data);
  return { success: true, data };
};
