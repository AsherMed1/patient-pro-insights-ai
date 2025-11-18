import { supabase } from '@/integrations/supabase/client';

export const updateTandraFloydIntake = async () => {
  console.log('Updating Tandra Floyd appointment...');
  
  const appointmentId = 'e6b40203-d277-4462-ab14-f80cfea47bf4';
  
  const updates = {
    parsed_contact_info: {
      name: "Tandra Floyd",
      phone: "(478) 258-9040",
      email: "tandrafloyd1965@gmail.com",
      address: "5578 Riverside Dr apt 203, Macon Georgia 31210"
    },
    parsed_demographics: {
      dob: "1965-05-13",
      age: 60,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      group_number: "2CVA",
      member_id: "9726331101",
      alternate_selection: "Other",
      notes: "Both knees pain for a couple of years. Pain is severe at times, making it difficult to walk. Has been taking OTC medications for relief."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Less than 1 month",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      pain_level: 10,
      symptoms: "Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness, Dull Ache",
      treatments_tried: "Injections",
      imaging_done: "YES",
      notes: "Patient reports pain in both knees for a couple of years. Pain is severe at times, making it difficult to walk. Has been taking OTC medications."
    },
    parsed_medical_info: {
      pcp: "Dr. Daniel Ukpong",
      pcp_phone: "478-746-0901"
    },
    ghl_id: "xf5paenesKtT7CCFFnPl",
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
    console.error('Error updating Tandra Floyd appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tandra Floyd appointment:', data);
  return { success: true, data };
};
