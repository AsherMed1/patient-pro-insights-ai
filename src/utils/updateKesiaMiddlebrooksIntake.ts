import { supabase } from '@/integrations/supabase/client';

export const updateKesiaMiddlebrooksIntake = async () => {
  console.log('Updating Kesia Middlebrooks appointment...');
  
  const appointmentId = 'd3bde647-6d46-44fc-afc8-ec9be3791433';
  
  const updates = {
    parsed_contact_info: {
      name: "Kesia Middlebrooks",
      phone: "(706) 975-4755",
      email: "kesiamiddlebrooks@gmail.com",
      address: "503 Triune Mill Rd, Thomaston Georgia 30286"
    },
    parsed_demographics: {
      dob: "1976-10-30",
      age: 49,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter HMO",
      plan: "Ambetter HMO",
      group_number: "2cva",
      alternate_selection: "Other",
      notes: "Left knee pain for years. Injury from work at jail during scuffle. Told by doctor she needs TKR. MRI done several years ago. Medications didn't help. Cannot bend knee all the way. Pain bothers her when she goes to sleep."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "YES",
      pain_level: 10,
      symptoms: "Stiffness, Swelling, Sharp Pain, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      notes: "Left knee pain for years due to work injury at jail. Doctor recommended TKR. Cannot bend knee fully. Pain interferes with sleep. Medications have not helped."
    },
    parsed_medical_info: {
      pcp_phone: "706-938-4483",
      imaging_done: "MRI done several years ago"
    },
    ghl_id: "rG64WTWhB3A1Ggpat2gm",
    detected_insurance_provider: "Ambetter HMO",
    detected_insurance_plan: "Ambetter HMO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Kesia Middlebrooks appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Kesia Middlebrooks appointment:', data);
  return { success: true, data };
};
