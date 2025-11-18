import { supabase } from '@/integrations/supabase/client';

export const updateBeverlyToliverIntake = async () => {
  console.log('Updating Beverly Toliver appointment...');
  
  const appointmentId = '607c31b0-3a13-4548-9733-daa68a93f791';
  
  const updates = {
    parsed_contact_info: {
      name: "Beverly Toliver",
      phone: "(678) 551-0660",
      email: "b_anntoliver@yahoo.com",
      address: "1805 Courtyard Ln, McDonough Georgia 30252"
    },
    parsed_demographics: {
      dob: "1963-06-30",
      age: 62,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Medicare PPO",
      plan: "Medicare PPO",
      alternate_selection: "Medicare",
      notes: "Both knees in pain, R knee is worse. Dealing with knee pain for a couple of years, but she says it feels like a 100. Injections only helped for a short time. Had imaging done with knees, xray, she had it done this year. Had her xray done at Resurgens Orthopaedics Georgia. She is diagnosed with OA and bone on bone."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 6,
      symptoms: "Stiffness, Swelling, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES",
      notes: "Both knees in pain, R knee is worse. She struggles with mobility the most. She walks with a cane. Getting around is her biggest issue. R knee is really stiff. Knee pain is there all the time."
    },
    parsed_medical_info: {
      imaging_location: "Resurgens Orthopaedics Georgia",
      mobility_aids: "Cane",
      primary_concern: "Mobility and getting around"
    },
    ghl_id: "C6dbevU1FhYdWUcYr6la",
    detected_insurance_provider: "Medicare PPO",
    detected_insurance_plan: "Medicare PPO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Beverly Toliver appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Beverly Toliver appointment:', data);
  return { success: true, data };
};
